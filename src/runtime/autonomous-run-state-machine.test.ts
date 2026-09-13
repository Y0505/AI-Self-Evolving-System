import test from "node:test";
import assert from "node:assert/strict";
import { ControlledAutonomousRunStateMachine } from "./autonomous-run-state-machine.js";

test("state machine follows the normal autonomous lifecycle", () => {
  const machine = new ControlledAutonomousRunStateMachine();
  const path = [
    "evaluate", "select_goal", "research", "plan", "build", "test",
    "deploy", "observe", "learn", "propose_improvement", "wait_for_approval",
    "execute_improvement", "verify_improvement", "learn_again", "completed",
  ] as const;

  for (const state of path) machine.transitionTo(state);
  assert.equal(machine.state, "completed");
});

test("rejected improvement can return to learning without executing", () => {
  const machine = new ControlledAutonomousRunStateMachine("wait_for_approval");
  assert.equal(machine.canTransitionTo("learn_again"), true);
  assert.equal(machine.canTransitionTo("execute_improvement"), true);
  assert.equal(machine.canTransitionTo("deploy"), false);
  machine.transitionTo("learn_again");
  assert.equal(machine.state, "learn_again");
});

test("failed execution can terminate the run", () => {
  const machine = new ControlledAutonomousRunStateMachine("execute_improvement");
  assert.equal(machine.canTransitionTo("failed"), true);
  machine.transitionTo("failed");
  assert.equal(machine.state, "failed");
});

test("terminal states cannot transition further", () => {
  const completed = new ControlledAutonomousRunStateMachine("completed");
  const failed = new ControlledAutonomousRunStateMachine("failed");
  assert.equal(completed.canTransitionTo("discover"), false);
  assert.equal(failed.canTransitionTo("discover"), false);
  assert.throws(() => completed.transitionTo("discover"), /Invalid autonomous run transition/);
});

test("invalid transitions are rejected deterministically", () => {
  const machine = new ControlledAutonomousRunStateMachine();
  assert.equal(machine.canTransitionTo("build"), false);
  assert.throws(() => machine.transitionTo("build"), /discover -> build/);
  assert.equal(machine.state, "discover");
});
