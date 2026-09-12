import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";
import { ControlledAutonomousTaskExecutionLoop } from "../src/runtime/autonomous-task-execution-loop.js";
import type { Task } from "../src/tasks/task.js";

const result = (status: "completed" | "failed", message: string) => ({ status, message });

const createOrchestrator = (maxTasks = 2) => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("task-run", {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({
      maxTasks,
      maxToolCalls: 4,
      maxRetries: 2,
      maxIterations: 5,
    }),
    audit,
    recovery: new DeterministicAutonomousRunRecoveryPolicy(2),
  });

  return { audit, orchestrator };
};

const task = (id = "task-1"): Task => ({
  id,
  title: "test task",
  description: "test task",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("records task start and completion around the real execution boundary", async () => {
  const { audit, orchestrator } = createOrchestrator();
  const execution = new ControlledAutonomousTaskExecutionLoop(
    {
      run: async () => result("completed", "done"),
    },
    orchestrator,
  );

  const output = await execution.run(task());

  assert.equal(output.status, "completed");
  const events = await audit.listByRun("task-run");
  assert.deepEqual(events.map((event) => event.type), ["task_started", "task_completed"]);
});

test("records failed task outcomes and recovery decisions without retrying", async () => {
  const { audit, orchestrator } = createOrchestrator();
  const execution = new ControlledAutonomousTaskExecutionLoop(
    {
      run: async () => result("failed", "temporary failure"),
    },
    orchestrator,
  );

  const output = await execution.run(task());

  assert.equal(output.status, "failed");
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

  await assert.rejects(execution.run(task()), /Execution budget exceeded for tasks/);
  assert.equal(calls, 0);
  const events = await audit.listByRun("task-run");
  assert.deepEqual(events.map((event) => event.type), ["budget_exceeded", "state_transition", "run_failed"]);
  assert.equal(events[0].metadata?.metric, "tasks");
});
