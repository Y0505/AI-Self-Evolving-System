import { describe, expect, it } from "vitest";
import { createGitHubPullRequestStatusTool } from "../../src/tools/github-status-tools.js";
import type { PullRequestStatusClient } from "../../src/github/pull-request-status-client.js";

describe("github_get_pull_request_status", () => {
  it("is read-only and delegates a validated request", async () => {
    let received: unknown;
    const client: PullRequestStatusClient = {
      async get(request) {
        received = request;
        return { number: 12, state: "open", merged: false, mergeable: true };
      },
    };

    const tool = createGitHubPullRequestStatusTool(client);
    expect(tool.requiresApproval).toBe(false);

    const result = await tool.execute(
      { owner: "Y0505", repository: "AI-Self-Evolving-System", number: 12 },
      { workspaceRoot: "/tmp/workspace" },
    );

    expect(received).toEqual({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 12 });
    expect(result.merged).toBe(false);
  });

  it("rejects invalid pull request numbers", async () => {
    const client: PullRequestStatusClient = { get: async () => ({ number: 1, state: "open", merged: false, mergeable: null }) };
    const tool = createGitHubPullRequestStatusTool(client);
    await expect(tool.execute({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 0 }, { workspaceRoot: "/tmp/workspace" })).rejects.toThrow("positive integer");
  });
});
