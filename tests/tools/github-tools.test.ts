import assert from "node:assert/strict";
import test from "node:test";
import { createGitHubPullRequestTool } from "../../src/tools/github-tools.js";
import type { PullRequestClient } from "../../src/github/pull-request-client.js";

const context = { workspaceRoot: "/tmp/workspace" };

test("GitHub pull request tool requires approval", () => {
  const client: PullRequestClient = {
    async create() {
      return { number: 1, url: "https://github.com/example/repo/pull/1", title: "Test", head: "feature", base: "main" };
    },
  };

  const tool = createGitHubPullRequestTool(client);
  assert.equal(tool.requiresApproval, true);
});

test("GitHub pull request tool delegates validated input", async () => {
  let received: unknown;
  const client: PullRequestClient = {
    async create(request) {
      received = request;
      return { number: 7, url: "https://github.com/example/repo/pull/7", title: request.title, head: request.head, base: request.base };
    },
  };

  const tool = createGitHubPullRequestTool(client);
  const result = await tool.execute(
    { owner: "example", repository: "repo", title: "  Add feature  ", body: "details", head: "feature", base: "main" },
    context,
  );

  assert.deepEqual(received, {
    owner: "example",
    repository: "repo",
    title: "Add feature",
    body: "details",
    head: "feature",
    base: "main",
  });
  assert.equal(result.number, 7);
});

test("GitHub pull request tool rejects incomplete input", async () => {
  const client: PullRequestClient = { async create() { throw new Error("should not be called"); } };
  const tool = createGitHubPullRequestTool(client);

  await assert.rejects(
    tool.execute({ owner: "example", repository: "repo", title: "", head: "feature", base: "main" }, context),
    /required/,
  );
});
