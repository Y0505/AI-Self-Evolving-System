import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const dependencies = () => ({
  stateMachine: new ControlledAutonomousRunStateMachine(),
  budget: new DeterministicExecutionBudget({
    maxTasks: 2,
    maxToolCalls: 4,
    maxRetries: 1,
    maxIterations: 5,
  }),
  audit: new InMemoryAutonomousRunEventStore(),
  recovery: new DeterministicAutonomousRunRecoveryPolicy(2),
  now: () => "2026-01-01T00:00:00.000Z",
  createEventId: (() => {
    let counter = 0;
    return () => `event-${++counter}`;
  })(),
});

test("orchestrator composes state, budget, audit, and recovery boundaries", async () => {
  const deps = dependencies();
  const orchestrator = new ControlledAutonomousRunOrchestrator("run-1", deps);

  await orchestrator.transition("evaluate");
  await orchestrator.recordTaskStart("task-1");
  await orchestrator.recordTaskCompletion("task-1", "done");
  await orchestrator.recordTaskFailure("task-2", {
    kind: "task_failure",
    message: "temporary provider failure",
    retryCount: 0,
  });

  assert.equal(orchestrator.state, "evaluate");
  assert.deepEqual(deps.budget.snapshot(), { tasks: 1, toolCalls: 0, retries: 0, iterations: 0 });

  const events = await deps.audit.listByRun("run-1");
  assert.deepEqual(events.map((event) => event.type), ["state_transition", "task_started", "task_completed", "task_failed"]);
  assert.equal(events[3].metadata?.recoveryAction, "retry");
});

test("orchestrator applies non-terminal recovery only through a valid lifecycle transition", async () => {
  const deps = dependencies();
  const orchestrator = new ControlledAutonomousRunOrchestrator("run-2", deps);

  for (const state of ["evaluate", "select_goal", "research", "plan", "build", "test", "observe", "learn", "propose_improvement", "wait_for_approval"] as const) {
    await orchestrator.transition(state);
  }

  await orchestrator.recordTaskFailure("task-1", {
    kind: "approval_rejected",
    message: "approval denied",
    retryCount: 0,
  });

  const events = await deps.audit.listByRun("run-2");
  assert.equal(events.at(-1)?.metadata, undefined);
  assert.equal(events.at(-1)?.type, "state_transition");
  assert.equal(events.at(-1)?.state, "learn_again");
  assert.equal(orchestrator.state, "learn_again");
});

test("completion and failure are terminal and auditable", async () => {
  const completeDeps = dependencies();
  const completed = new ControlledAutonomousRunOrchestrator("run-complete", completeDeps);
  for (const state of ["evaluate", "select_goal", "research", "plan", "build", "test", "observe", "learn"] as const) {
    await completed.transition(state);
  }
  await completed.complete("finished");
  assert.equal(completed.state, "completed");
  assert.deepEqual((await completeDeps.audit.listByRun("run-complete")).at(-2)?.type, "state_transition");
  assert.equal((await completeDeps.audit.listByRun("run-complete")).at(-1)?.type, "run_completed");

  const failDeps = dependencies();
  const failed = new ControlledAutonomousRunOrchestrator("run-fail", failDeps);
  await failed.fail("unsafe transition");
  assert.equal(failed.state, "failed");
  assert.deepEqual((await failDeps.audit.listByRun("run-fail")).map((event) => event.type), ["state_transition", "run_failed"]);
});

test("invalid run and task identifiers are rejected", async () => {
  const deps = dependencies();
  assert.throws(() => new ControlledAutonomousRunOrchestrator("", deps), /run id is required/);

  const orchestrator = new ControlledAutonomousRunOrchestrator("run-3", deps);
  await assert.rejects(orchestrator.recordTaskStart(""), /task id is required/);
  await assert.rejects(orchestrator.recordTaskFailure("", {
    kind: "task_failure",
    message: "failure",
    retryCount: 0,
  }), /task id is required/);
});
