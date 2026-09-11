import test from "node:test";
import assert from "node:assert/strict";
import type { ImprovementExecutionResult } from "./improvement-execution.js";
import { DeterministicImprovementVerifier } from "./improvement-verification.js";

const execution: ImprovementExecutionResult = {
  proposalId: "review-failure-pattern:timeout",
  status: "executed",
  message: "Improvement approved; execution boundary reached without modifying the system.",
};

test("verifier returns verified for a matching passing observation", () => {
  const verifier = new DeterministicImprovementVerifier();

  assert.deepEqual(verifier.verify(execution, {
    proposalId: execution.proposalId,
    passed: true,
    summary: "Verification checks passed.",
  }), {
    proposalId: execution.proposalId,
    status: "verified",
    summary: "Verification checks passed.",
  });
});

test("verifier returns failed for a matching failing observation", () => {
  const verifier = new DeterministicImprovementVerifier();

  assert.deepEqual(verifier.verify(execution, {
    proposalId: execution.proposalId,
    passed: false,
    summary: "Verification checks failed.",
  }), {
    proposalId: execution.proposalId,
    status: "failed",
    summary: "Verification checks failed.",
  });
});

test("verifier returns unknown when no observation is available", () => {
  const verifier = new DeterministicImprovementVerifier();

  assert.deepEqual(verifier.verify(execution), {
    proposalId: execution.proposalId,
    status: "unknown",
    summary: "No verification observation was provided.",
  });
});

test("verifier returns unknown when execution was rejected", () => {
  const verifier = new DeterministicImprovementVerifier();
  const rejected: ImprovementExecutionResult = {
    proposalId: execution.proposalId,
    status: "rejected",
    message: "Improvement execution requires explicit approval.",
  };

  assert.deepEqual(verifier.verify(rejected, {
    proposalId: rejected.proposalId,
    passed: true,
    summary: "Should not verify a rejected execution.",
  }), {
    proposalId: rejected.proposalId,
    status: "unknown",
    summary: "Improvement execution did not reach the execution boundary; verification is unknown.",
  });
});

test("verifier fails mismatched proposal identity", () => {
  const verifier = new DeterministicImprovementVerifier();

  assert.deepEqual(verifier.verify(execution, {
    proposalId: "different-proposal",
    passed: true,
    summary: "Verification checks passed.",
  }), {
    proposalId: execution.proposalId,
    status: "failed",
    summary: "Verification observation does not match the executed proposal.",
  });
});
