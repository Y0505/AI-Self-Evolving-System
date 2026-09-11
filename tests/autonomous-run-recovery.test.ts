import assert from "node:assert/strict";
import test from "node:test";
import {
  DeterministicAutonomousRunRecoveryPolicy,
} from "../src/runtime/autonomous-run-recovery.js";

const failure = (
  kind: Parameters<DeterministicAutonomousRunRecoveryPolicy["decide"]>[0]["kind"],
  retryCount = 0,
) => ({
  kind,
  message: `${kind} occurred`,
  retryCount,
});

test("retries task failures while retry budget remains", () => {
  const policy = new DeterministicAutonomousRunRecoveryPolicy(2);

  assert.equal(policy.decide(failure("task_failure", 0)), "retry");
  assert.equal(policy.decide(failure("task_failure", 1)), "retry");
  assert.equal(policy.decide(failure("task_failure", 2)), "stop");
});

test("routes approval rejection and verification failure back to learning", () => {
  const policy = new DeterministicAutonomousRunRecoveryPolicy(3);

  assert.equal(policy.decide(failure("approval_rejected", 0)), "learn_again");
  assert.equal(policy.decide(failure("verification_failed", 3)), "learn_again");
});

test("stops terminal safety failures without retrying", () => {
  const policy = new DeterministicAutonomousRunRecoveryPolicy(3);

  assert.equal(policy.decide(failure("budget_exceeded", 0)), "stop");
  assert.equal(policy.decide(failure("budget_exceeded", 2)), "stop");
  assert.equal(policy.decide(failure("invalid_transition", 0)), "stop");
});

test("rejects invalid retry configuration and retry counts", () => {
  assert.throws(
    () => new DeterministicAutonomousRunRecoveryPolicy(-1),
    /maxRetries must be a non-negative integer/,
  );

  const policy = new DeterministicAutonomousRunRecoveryPolicy(1);
  assert.throws(
    () => policy.decide(failure("task_failure", -1)),
    /retryCount must be a non-negative integer/,
  );
  assert.throws(
    () => policy.decide(failure("task_failure", 1.5)),
    /retryCount must be a non-negative integer/,
  );
});
