import assert from "node:assert/strict";
import { test } from "node:test";
import { executeSafeRecoveryAction } from "../src/runtime/autonomous-recovery-action.js";

test("executes stop as a terminal failure transition", () => {
  assert.deepEqual(executeSafeRecoveryAction("stop"), {
    action: "stop",
    nextState: "failed",
    executed: true,
  });
});

test("executes learn_again as an explicit lifecycle transition", () => {
  assert.deepEqual(executeSafeRecoveryAction("learn_again"), {
    action: "learn_again",
    nextState: "learn_again",
    executed: true,
  });
});

test("executes wait_for_approval without bypassing approval", () => {
  assert.deepEqual(executeSafeRecoveryAction("wait_for_approval"), {
    action: "wait_for_approval",
    nextState: "wait_for_approval",
    executed: true,
  });
});

test("does not automatically execute retry", () => {
  assert.deepEqual(executeSafeRecoveryAction("retry"), {
    action: "retry",
    nextState: null,
    executed: false,
  });
});
