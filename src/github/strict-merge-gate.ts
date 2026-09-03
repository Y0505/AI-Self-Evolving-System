import type { PullRequestChecksClient } from "./pull-request-checks-client.js";
import type { PullRequestMergeClient, PullRequestMergeResult } from "./pull-request-merge-client.js";
import type { PullRequestReviewsClient } from "./pull-request-reviews-client.js";
import type { PullRequestStatusClient } from "./pull-request-status-client.js";

export interface StrictMergeGateRequest {
  owner: string;
  repository: string;
  number: number;
  expectedHeadSha: string;
}

export interface StrictMergeGateResult {
  status: "ready" | "blocked";
  reasons: string[];
  headSha: string | null;
}

export interface StrictMergeGateDependencies {
  statusClient: PullRequestStatusClient;
  checksClient: PullRequestChecksClient;
  reviewsClient: PullRequestReviewsClient;
  mergeClient: PullRequestMergeClient;
}

export class StrictMergeGate {
  constructor(private readonly dependencies: StrictMergeGateDependencies) {}

  async evaluate(request: StrictMergeGateRequest): Promise<StrictMergeGateResult> {
    this.validate(request);
    const base = { owner: request.owner.trim(), repository: request.repository.trim(), number: request.number };
    const status = await this.dependencies.statusClient.get(base);
    const reasons: string[] = [];

    if (status.state !== "open") reasons.push("Pull request is not open");
    if (status.merged) reasons.push("Pull request is already merged");
    if (status.headSha !== request.expectedHeadSha.trim()) reasons.push("Pull request head SHA does not match expected SHA");

    const checks = await this.dependencies.checksClient.get({ ...base, ref: status.headSha });
    if (!checks.allCompleted) reasons.push("GitHub checks are still pending");
    if (!checks.allSuccessful) reasons.push("GitHub checks are not all successful");

    const reviews = await this.dependencies.reviewsClient.get(base);
    if (reviews.status !== "success") reasons.push(`Pull request reviews are ${reviews.status}`);

    return { status: reasons.length === 0 ? "ready" : "blocked", reasons, headSha: status.headSha };
  }

  async merge(request: StrictMergeGateRequest): Promise<PullRequestMergeResult> {
    const initialGate = await this.evaluate(request);
    if (initialGate.status !== "ready") {
      throw new Error(`Strict merge gate blocked: ${initialGate.reasons.join("; ")}`);
    }

    // Re-check immediately before the mutation. The merge API also receives
    // the verified SHA so a concurrent head change is rejected by GitHub.
    const finalGate = await this.evaluate(request);
    if (finalGate.status !== "ready" || finalGate.headSha === null) {
      const reasons = finalGate.reasons.length > 0 ? finalGate.reasons.join("; ") : "Pull request head SHA is unavailable";
      throw new Error(`Strict merge gate blocked: ${reasons}`);
    }

    return this.dependencies.mergeClient.merge({
      owner: request.owner.trim(),
      repository: request.repository.trim(),
      number: request.number,
      expectedHeadSha: finalGate.headSha,
    });
  }

  private validate(request: StrictMergeGateRequest): void {
    if (!request || typeof request !== "object") throw new Error("Strict merge request is required");
    if (!request.owner?.trim() || !request.repository?.trim()) throw new Error("Pull request owner and repository are required");
    if (!Number.isInteger(request.number) || request.number <= 0) throw new Error("Pull request number must be a positive integer");
    if (!request.expectedHeadSha?.trim()) throw new Error("Expected pull request head SHA is required");
  }
}
