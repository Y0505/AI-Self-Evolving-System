import assert from "node:assert/strict";
import { test } from "node:test";
import { ControlledAutonomousTaskExecutionLoop } from "../src/runtime/autonomous-task-execution-loop.js";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";
import type { ExecutionResult } from "../src/core/execution.js";

const createOrchestrator = (maxTasks = 2) => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("task-run", {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({ maxTasks, maxToolCalls: 4, maxRetries: 1, maxIterations: 5 }),
    audit,
    recovery: new DeterministicAutonomousRunRecoveryPolicy(1),
    now: () => "2026-01-01T00:00:00.000Z",
    createEventId: (() => {
      let counter = 0;
      return () => `event-${++counter}`;
    })(),
  });
  return { audit, orchestrator };
};

const result = (status: ExecutionResult["status"], message: string): ExecutionResult => ({
  taskId: "task-1",
  status,
  message,
});

test("records task start and completion around the real execution boundary", async () => {
  const { audit, orchestrator } = createOrchestrator();
  const calls: string[] = [];
  const execution = new ControlledAutonomousTaskExecutionLoop(
    {
      run: async (taskId) => {
        calls.push(taskId);
        return result("completed", "task completed");
      },
    },
    orchestrator,
  );

  const output = await execution.run("task-1");

  assert.equal(output.status, "completed");
  assert.deepEqual(calls, ["task-1"]);
  assert.deepEqual((await audit.listByRun("task-run")).map((event) => event.type), [
    "task_started",
    "task_completed",
  ]);
});

test("records failed task outcomes and recovery decisions without retrying", async () => {
  const { audit, orchestrator } = createOrchestrator();
  let calls = 0;
  const execution = new ControlledAutonomousTaskExecutionLoop(
    {
      run: async () => {
        calls += 1;
        return result("failed", "provider unavailable");
      },
    },
    orchestrator,
  );

  const output = await execution.run("task-1");

  assert.equal(output.status, "failed");
  assert.equal(calls, 1);
  const events = await audit.listByRun("task-run");
  assert.deepEqual(events.map((event) => event.type), ["task_started", "task_failed"]);
  assert.equal(events[1].metadata?.recoveryAction, "retry");
});

test("records a budget boundary failure without executing the task", async () => {
  const { audit, orchestrator } = createOrchestrator(0);
  let calls = 0;
  const execution = new ControlledAutonomousTaskExecutionLoop(
    {
      run: async () => {
        calls += 1;
        return result("completed", "should not run");
      },
    },
    orchestrator,
  );

  await assert.rejects(execution.run("task-1"), /Execution budget exceeded for tasks/);
  assert.equal(calls, 0);
  const events = await audit.listByRun("task-run");
  assert.deepEqual(events.map((event) => event.type), ["budget_exceeded"]);
  assert.equal(events[0].metadata?.metric, "tasks");
});
