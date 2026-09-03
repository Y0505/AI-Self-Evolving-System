import type { StrictMergeGate, StrictMergeGateRequest } from "../github/strict-merge-gate.js";
import type { PullRequestMergeResult } from "../github/pull-request-merge-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface MergePullRequestInput extends StrictMergeGateRequest {}

export const createGitHubMergePullRequestTool = (
  gate: StrictMergeGate,
): Tool<MergePullRequestInput, PullRequestMergeResult> => ({
  name: "github_merge_pull_request",
  description: "Merge a GitHub pull request only when the strict merge gate passes. Approval is required; the gate is re-evaluated at execution time and the expected head SHA is enforced by the merge request.",
  requiresApproval: true,
  async execute(input: MergePullRequestInput, _context: ToolContext) {
    if (!input || typeof input !== "object") throw new Error("Pull request merge input is required");
    return gate.merge({
      owner: input.owner?.trim(),
      repository: input.repository?.trim(),
      number: input.number,
      expectedHeadSha: input.expectedHeadSha?.trim(),
    });
  },
});
