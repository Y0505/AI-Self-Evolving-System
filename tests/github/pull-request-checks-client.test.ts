import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GitHubPullRequestChecksClient } from "../../src/github/pull-request-checks-client.js";

describe("GitHubPullRequestChecksClient", () => {
  it("aggregates completed, successful, failed, and pending checks", async () => {
    let requestedUrl = "";
    const client = new GitHubPullRequestChecksClient({
      token: "test-token",
      apiBaseUrl: "https://github.test",
      fetchImpl: async (input) => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({
          total_count: 4,
          check_runs: [
            { status: "completed", conclusion: "success" },
            { status: "completed", conclusion: "failure" },
            { status: "completed", conclusion: "neutral" },
            { status: "in_progress", conclusion: null },
          ],
        }), { status: 200 });
      },
    });

    const result = await client.get({ owner: "Y0505", repository: "AI-Self-Evolving-System", ref: "abc123" });
    assert.equal(requestedUrl, "https://github.test/repos/Y0505/AI-Self-Evolving-System/commits/abc123/check-runs");
    assert.deepEqual(result, {
      ref: "abc123", total: 4, completed: 3, pending: 1,
      successful: 1, failed: 2, allCompleted: false, allSuccessful: false,
    });
  });

  it("requires at least one successful completed check", async () => {
    const client = new GitHubPullRequestChecksClient({
      token: "test-token",
      fetchImpl: async () => new Response(JSON.stringify({ check_runs: [] }), { status: 200 }),
    });
    const result = await client.get({ owner: "Y0505", repository: "repo", ref: "main" });
    assert.equal(result.allCompleted, true);
    assert.equal(result.allSuccessful, false);
  });

  it("rejects an invalid ref", async () => {
    const client = new GitHubPullRequestChecksClient({ token: "test-token" });
    await assert.rejects(client.get({ owner: "Y0505", repository: "repo", ref: "-main" }), /cannot start/);
  });
});
