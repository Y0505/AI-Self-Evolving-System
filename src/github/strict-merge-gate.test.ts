import assert from "node:assert/strict";
import test from "node:test";
import { StrictMergeGate, type StrictMergeGateDependencies, type StrictMergeGateRequest } from "./strict-merge-gate.js";

const request: StrictMergeGateRequest = {
  owner: "Y0505",
  repository: "AI-Self-Evolving-System",
  number: 99,
  expectedHeadSha: "head-1",
};

function deps(overrides: Partial<StrictMergeGateDependencies> = {}): StrictMergeGateDependencies {
  return {
    statusClient: { get: async () => ({ number: 99, state: "open", merged: false, mergeable: true, headSha: "head-1" }) },
    checksClient: { get: async () => ({ ref: "head-1", total: 1, completed: 1, pending: 0, successful: 1, failed: 0, allCompleted: true, allSuccessful: true }) },
    reviewsClient: { get: async () => ({ number: 99, status: "success", total: 1, reviewers: 1, approved: 1, changesRequested: 0, commented: 0 }) },
    mergeClient: { merge: async () => ({ merged: true, sha: "merge-1", message: "Merged" }) },
    ...overrides,
  };
}

test("allows merge when all strict gate conditions pass", async () => {
  const gate = new StrictMergeGate(deps());
  const result = await gate.evaluate(request);
  assert.deepEqual(result, { status: "ready", reasons: [], headSha: "head-1" });
  const merged = await gate.merge(request);
  assert.equal(merged.merged, true);
  assert.equal(merged.sha, "merge-1");
});

test("blocks stale expected head SHA", async () => {
  const gate = new StrictMergeGate(deps({ statusClient: { get: async () => ({ number: 99, state: "open", merged: false, mergeable: true, headSha: "head-2" }) } }));
  const result = await gate.evaluate(request);
  assert.equal(result.status, "blocked");
  assert.match(result.reasons.join("; "), /head SHA/);
});

test("blocks pending or failed checks", async () => {
  const gate = new StrictMergeGate(deps({ checksClient: { get: async () => ({ ref: "head-1", total: 2, completed: 1, pending: 1, successful: 1, failed: 0, allCompleted: false, allSuccessful: false }) } }));
  await assert.rejects(() => gate.merge(request), /checks/);
});

test("blocks unknown reviews", async () => {
  const gate = new StrictMergeGate(deps({ reviewsClient: { get: async () => ({ number: 99, status: "unknown", total: 0, reviewers: 0, approved: 0, changesRequested: 0, commented: 0 }) } }));
  await assert.rejects(() => gate.merge(request), /reviews are unknown/);
});

test("blocks changes requested", async () => {
  const gate = new StrictMergeGate(deps({ reviewsClient: { get: async () => ({ number: 99, status: "failure", total: 1, reviewers: 1, approved: 0, changesRequested: 1, commented: 0 }) } }));
  await assert.rejects(() => gate.merge(request), /reviews are failure/);
});

test("blocks closed pull requests", async () => {
  const gate = new StrictMergeGate(deps({ statusClient: { get: async () => ({ number: 99, state: "closed", merged: false, mergeable: false, headSha: "head-1" }) } }));
  await assert.rejects(() => gate.merge(request), /not open/);
});

test("does not merge when head changes during the gate evaluation", async () => {
  let reads = 0;
  let mergeCalls = 0;
  const gate = new StrictMergeGate(deps({
    statusClient: {
      get: async () => ({ number: 99, state: "open", merged: false, mergeable: true, headSha: ++reads === 1 ? "head-1" : "head-2" }),
    },
    mergeClient: { merge: async () => { mergeCalls += 1; return { merged: true, sha: "merge-1", message: "Merged" }; } },
  }));

  await assert.rejects(() => gate.merge(request), /head SHA/);
  assert.equal(mergeCalls, 0);
});
