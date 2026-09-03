import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGitHubPullRequestStatusTool } from "../../src/tools/github-status-tools.js";
import type { PullRequestStatusClient } from "../../src/github/pull-request-status-client.js";

describe("github_get_pull_request_status", () => {
  it("is read-only and delegates a validated request", async () => {
    let received: unknown;
    const client: PullRequestStatusClient = {
      async get(request) {
        received = request;
        return {
          number: 12,
          state: "open",
          merged: false,
          mergeable: true,
          checks: "unknown",
          reviewDecision: "unknown",
        };
      },
    };

    const tool = createGitHubPullRequestStatusTool(client);
    assert.equal(tool.requiresApproval, false);

    const result = await tool.execute(
      { owner: "Y0505", repository: "AI-Self-Evolving-System", number: 12 },
      { workspaceRoot: "/tmp/workspace" },
    );

    assert.deepEqual(received, {
      owner: "Y0505",
      repository: "AI-Self-Evolving-System",
      number: 12,
    });
    assert.equal(result.merged, false);
  });

  it("rejects invalid pull request numbers", async () => {
    const client: PullRequestStatusClient = {
      get: async () => ({
        number: 1,
        state: "open",
        merged: false,
        mergeable: null,
        checks: "unknown",
        reviewDecision: "unknown",
      }),
    };
    const tool = createGitHubPullRequestStatusTool(client);

    await assert.rejects(
      tool.execute(
        { owner: "Y0505", repository: "AI-Self-Evolving-System", number: 0 },
        { workspaceRoot: "/tmp/workspace" },
      ),
      /positive integer/,
    );
  });
});
