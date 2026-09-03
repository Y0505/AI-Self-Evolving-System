import type { PullRequestStatusClient, PullRequestStatusRequest, PullRequestStatusResult } from "../github/pull-request-status-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface GetPullRequestStatusInput extends PullRequestStatusRequest {}

export const createGitHubPullRequestStatusTool = (
  client: PullRequestStatusClient,
): Tool<GetPullRequestStatusInput, PullRequestStatusResult> => ({
  name: "github_get_pull_request_status",
  description: "Read the current GitHub pull request state and mergeability. This is a read-only operation and does not require approval.",
  requiresApproval: false,
  async execute(input: GetPullRequestStatusInput, _context: ToolContext) {
    if (!input || typeof input !== "object") throw new Error("Pull request status input is required");
    const request: PullRequestStatusRequest = {
      owner: input.owner?.trim(),
      repository: input.repository?.trim(),
      number: input.number,
    };
    if (!request.owner || !request.repository) throw new Error("Pull request owner and repository are required");
    if (!Number.isInteger(request.number) || request.number <= 0) throw new Error("Pull request number must be a positive integer");
    return client.get(request);
  },
});
