import type { PullRequestClient, PullRequestRequest } from "../github/pull-request-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface CreatePullRequestInput {
  owner: string;
  repository: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}

export interface CreatePullRequestOutput {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
}

export const createGitHubPullRequestTool = (
  client: PullRequestClient,
): Tool<CreatePullRequestInput, CreatePullRequestOutput> => ({
  name: "github_create_pull_request",
  description:
    "Create a GitHub pull request from an existing pushed branch. This is an external repository mutation and always requires explicit approval.",
  requiresApproval: true,
  async execute(input: CreatePullRequestInput, _context: ToolContext) {
    if (!input || typeof input !== "object") {
      throw new Error("Pull request input is required");
    }

    const request: PullRequestRequest = {
      owner: input.owner?.trim(),
      repository: input.repository?.trim(),
      title: input.title?.trim(),
      body: input.body,
      head: input.head?.trim(),
      base: input.base?.trim(),
    };

    if (!request.owner || !request.repository || !request.title || !request.head || !request.base) {
      throw new Error("Pull request owner, repository, title, head, and base are required");
    }

    return client.create(request);
  },
});
