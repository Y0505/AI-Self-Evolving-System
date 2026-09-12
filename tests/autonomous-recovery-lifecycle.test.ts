import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const createOrchestrator = () => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("recovery-lifecycle-run", {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({
      maxTasks: 2,
      maxToolCalls: 4,
      maxRetries: 2,
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

test("returns the recovery decision to the lifecycle caller for task failures", async () => {
  const { orchestrator } = createOrchestrator();

  const action = await orchestrator.recordTaskFailure("task-1", {
    kind: "task_failure",
    message: "temporary failure",
    retryCount: 0,
  });

  assert.equal(action, "retry");
});

test("returns terminal stop for budget exhaustion without changing run state", async () => {
  const { audit, orchestrator } = createOrchestrator();

  const action = await orchestrator.recordBudgetExceeded("toolCalls", "tool-call budget exhausted");

  assert.equal(action, "stop");
  assert.equal(orchestrator.state, "created");
  const events = await audit.listByRun("recovery-lifecycle-run");
  assert.equal(events[0].metadata?.recoveryAction, "stop");
});
