import type {
  PullRequestReviewsClient,
  PullRequestReviewsRequest,
  PullRequestReviewsResult,
} from "../github/pull-request-reviews-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface GetPullRequestReviewsInput extends PullRequestReviewsRequest {}

export const createGitHubPullRequestReviewsTool = (
  client: PullRequestReviewsClient,
): Tool<GetPullRequestReviewsInput, PullRequestReviewsResult> => ({
  name: "github_get_pull_request_reviews",
  description: "Read the current GitHub pull request review state. This is a read-only operation and does not require approval.",
  requiresApproval: false,
  async execute(input: GetPullRequestReviewsInput, _context: ToolContext) {
    if (!input || typeof input !== "object") throw new Error("Pull request reviews input is required");
    const request: PullRequestReviewsRequest = {
      owner: input.owner?.trim(),
      repository: input.repository?.trim(),
      number: input.number,
    };
    if (!request.owner || !request.repository) throw new Error("Pull request owner and repository are required");
    if (!Number.isInteger(request.number) || request.number <= 0) throw new Error("Pull request number must be a positive integer");
    return client.get(request);
  },
});
