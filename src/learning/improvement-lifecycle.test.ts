import test from "node:test";
import assert from "node:assert/strict";
import type { ImprovementProposal } from "./improvement-proposal.js";
import { ImprovementCheckpoint } from "./improvement-checkpoint.js";
import { ApprovedImprovementExecutor } from "./improvement-execution.js";
import { ControlledImprovementLifecycle } from "./improvement-lifecycle.js";
import { DeterministicImprovementVerifier } from "./improvement-verification.js";

const proposal: ImprovementProposal = {
  id: "review-failure-pattern:timeout",
  title: "Review recurring failure: timeout",
  rationale: "Review the evidence before considering an implementation change.",
  evidence: { totalRecords: 3, failures: 2, successRate: 1 / 3 },
  status: "proposed",
};

const lifecycle = (approved: boolean) => new ControlledImprovementLifecycle(
  new ImprovementCheckpoint({ requestApproval: async () => approved }),
  new ApprovedImprovementExecutor(),
  new DeterministicImprovementVerifier(),
);

test("runs approved proposal through execution and verification", async () => {
  const result = await lifecycle(true).run(proposal, {
    proposalId: proposal.id,
    passed: true,
    summary: "Verification checks passed.",
  });

  assert.equal(result.proposalId, proposal.id);
  assert.equal(result.approval, "approved");
  assert.equal(result.execution?.status, "executed");
  assert.equal(result.verification?.status, "verified");
});

test("stops before execution when approval is rejected", async () => {
  const result = await lifecycle(false).run(proposal, {
    proposalId: proposal.id,
    passed: true,
    summary: "Should never be evaluated.",
  });

  assert.deepEqual(result, {
    proposalId: proposal.id,
    approval: "rejected",
    execution: null,
    verification: null,
  });
});

test("preserves failed verification after approved execution", async () => {
  const result = await lifecycle(true).run(proposal, {
    proposalId: proposal.id,
    passed: false,
    summary: "Verification checks failed.",
  });

  assert.equal(result.approval, "approved");
  assert.equal(result.execution?.status, "executed");
  assert.equal(result.verification?.status, "failed");
});

test("returns unknown verification when approved execution has no observation", async () => {
  const result = await lifecycle(true).run(proposal);

  assert.equal(result.execution?.status, "executed");
  assert.equal(result.verification?.status, "unknown");
});
