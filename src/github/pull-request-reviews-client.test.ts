import assert from "node:assert/strict";
import test from "node:test";
import { GitHubPullRequestReviewsClient } from "./pull-request-reviews-client.js";

const makeClient = (payload: unknown) =>
  new GitHubPullRequestReviewsClient({
    token: "test-token",
    apiBaseUrl: "https://example.test",
    fetchImpl: async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

test("aggregates the latest review from each reviewer", async () => {
  const client = makeClient([
    { user: { login: "alice" }, state: "APPROVED", submitted_at: "2026-09-03T10:00:00Z" },
    { user: { login: "alice" }, state: "COMMENTED", submitted_at: "2026-09-03T11:00:00Z" },
    { user: { login: "bob" }, state: "APPROVED", submitted_at: "2026-09-03T10:30:00Z" },
  ]);

  const result = await client.get({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 25 });

  assert.deepEqual(result, {
    number: 25,
    status: "success",
    total: 3,
    reviewers: 2,
    approved: 1,
    changesRequested: 0,
    commented: 1,
  });
});

test("blocks when the latest review requests changes", async () => {
  const client = makeClient([
    { user: { login: "alice" }, state: "APPROVED", submitted_at: "2026-09-03T10:00:00Z" },
    { user: { login: "alice" }, state: "CHANGES_REQUESTED", submitted_at: "2026-09-03T11:00:00Z" },
    { user: { login: "bob" }, state: "APPROVED", submitted_at: "2026-09-03T10:30:00Z" },
  ]);

  const result = await client.get({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 25 });

  assert.equal(result.status, "failure");
  assert.equal(result.approved, 1);
  assert.equal(result.changesRequested, 1);
});

test("returns unknown when there are no usable reviews", async () => {
  const client = makeClient([
    { user: null, state: "APPROVED", submitted_at: "2026-09-03T10:00:00Z" },
    { user: { login: "alice" }, state: "DISMISSED", submitted_at: "2026-09-03T11:00:00Z" },
  ]);

  const result = await client.get({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 25 });

  assert.equal(result.status, "unknown");
  assert.equal(result.reviewers, 1);
  assert.equal(result.approved, 0);
});

test("rejects invalid pull request numbers", async () => {
  const client = makeClient([]);
  await assert.rejects(
    client.get({ owner: "Y0505", repository: "AI-Self-Evolving-System", number: 0 }),
    /positive integer/,
  );
});
