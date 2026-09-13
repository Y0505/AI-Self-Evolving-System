import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const createOrchestrator = () => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("budget-run", {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({
      maxTasks: 2,
      maxToolCalls: 4,
      maxRetries: 1,
      maxIterations: 5,
    }),
    audit,
    recovery: new DeterministicAutonomousRunRecoveryPolicy(2),
    now: () => "2026-01-01T00:00:00.000Z",
    createEventId: (() => {
      let counter = 0;
      return () => `event-${++counter}`;
    })(),
  });

  return { audit, orchestrator };
};

test("records budget exhaustion with the deterministic stop recovery action", async () => {
  const { audit, orchestrator } = createOrchestrator();

  await orchestrator.recordBudgetExceeded("toolCalls", "Execution budget exceeded for toolCalls");

  const events = await audit.listByRun("budget-run");
  assert.equal(events.length, 3);
  assert.equal(events[0].type, "budget_exceeded");
  assert.equal(events[0].metadata?.metric, "toolCalls");
  assert.equal(events[0].metadata?.recoveryAction, "stop");
  assert.equal(events[1].type, "state_transition");
  assert.equal(events[1].state, "failed");
  assert.equal(events[2].type, "run_failed");
});

test("budget recovery classification does not consume retry budget or execute a retry", async () => {
  const { audit, orchestrator } = createOrchestrator();
  let executions = 0;

  const execute = async () => {
    executions += 1;
  };

  await assert.rejects(
    async () => {
      await execute();
      throw new Error("Execution budget exceeded for tasks");
    },
    /Execution budget exceeded for tasks/,
  );
  await orchestrator.recordBudgetExceeded("tasks", "Execution budget exceeded for tasks");

  assert.equal(executions, 1);
  const events = await audit.listByRun("budget-run");
  assert.equal(events[0].metadata?.recoveryAction, "stop");
});

test("keeps ordinary task failure recovery independent from budget recovery", async () => {
  const { audit, orchestrator } = createOrchestrator();

  await orchestrator.recordTaskFailure("task-1", {
    kind: "task_failure",
    message: "provider unavailable",
    retryCount: 0,
  });
  await orchestrator.recordBudgetExceeded("iterations", "Execution budget exceeded for iterations");

  const events = await audit.listByRun("budget-run");
  assert.equal(events[0].metadata?.recoveryAction, "retry");
  assert.equal(events[1].metadata?.recoveryAction, "stop");
});
