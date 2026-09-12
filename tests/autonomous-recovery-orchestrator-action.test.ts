import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const createOrchestrator = () => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("recovery-action-run", {
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

test("applies learn_again through the controlled state machine", async () => {
  const { audit, orchestrator } = createOrchestrator();
  await orchestrator.transition("evaluate");
  await orchestrator.recordTaskFailure("task-1", {
    kind: "approval_rejected",
    message: "approval rejected",
    retryCount: 0,
  });

  assert.equal(orchestrator.state, "learn_again");
  const events = await audit.listByRun("recovery-action-run");
  assert.equal(events.at(-1)?.type, "state_transition");
  assert.equal(events.at(-1)?.state, "learn_again");
});

test("does not execute retry implicitly", async () => {
  const { orchestrator } = createOrchestrator();
  let actionReturned = false;

  const action = await orchestrator.recordTaskFailure("task-1", {
    kind: "task_failure",
    message: "temporary failure",
    retryCount: 0,
  });
  actionReturned = action === "retry";

  assert.equal(actionReturned, true);
  assert.equal(orchestrator.state, "discover");
});

test("rejects an unsafe recovery transition instead of bypassing the state machine", async () => {
  const { orchestrator } = createOrchestrator();
  await assert.rejects(
    orchestrator.recordTaskFailure("task-1", {
      kind: "approval_rejected",
      message: "approval rejected",
      retryCount: 0,
    }),
    /Invalid autonomous run transition/,
  );
  assert.equal(orchestrator.state, "discover");
});
