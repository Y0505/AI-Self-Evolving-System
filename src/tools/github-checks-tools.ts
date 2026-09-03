import type {
  PullRequestChecksClient,
  PullRequestChecksRequest,
  PullRequestChecksResult,
} from "../github/pull-request-checks-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface GetPullRequestChecksInput extends PullRequestChecksRequest {}

export const createGitHubPullRequestChecksTool = (
  client: PullRequestChecksClient,
): Tool<GetPullRequestChecksInput, PullRequestChecksResult> => ({
  name: "github_get_pull_request_checks",
  description:
    "Read GitHub check-run status for a commit or branch ref. This is read-only and does not require approval.",
  requiresApproval: false,
  async execute(input: GetPullRequestChecksInput, _context: ToolContext) {
    if (!input || typeof input !== "object") {
      throw new Error("Pull request checks input is required");
    }

    const request: PullRequestChecksRequest = {
      owner: input.owner?.trim(),
      repository: input.repository?.trim(),
      ref: input.ref?.trim(),
    };

    if (!request.owner || !request.repository) {
      throw new Error("Pull request checks owner and repository are required");
    }
    if (!request.ref || request.ref.startsWith("-")) {
      throw new Error("Pull request checks ref is required and cannot start with '-'");
    }

    return client.get(request);
  },
});
