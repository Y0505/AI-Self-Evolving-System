import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousRunExecution } from "../src/runtime/autonomous-run-execution.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const createExecution = () => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator("run-execution", {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({
      maxTasks: 2,
      maxToolCalls: 4,
      maxRetries: 1,
      maxIterations: 5,
    }),
    audit,
    recovery: new DeterministicAutonomousRunRecoveryPolicy(1),
    now: () => "2026-01-01T00:00:00.000Z",
    createEventId: (() => {
      let counter = 0;
      return () => `event-${++counter}`;
    })(),
  });

  return { audit, orchestrator, execution: new ControlledAutonomousRunExecution(orchestrator) };
};

test("execution runs lifecycle steps and records terminal completion", async () => {
  const { audit, orchestrator, execution } = createExecution();
  const calls: string[] = [];

  const result = await execution.execute([
    { state: "evaluate", run: async () => { calls.push("evaluate"); } },
    { state: "select_goal", run: async () => { calls.push("select_goal"); } },
    { state: "research", run: async () => { calls.push("research"); } },
    { state: "plan", run: async () => { calls.push("plan"); } },
    { state: "build", run: async () => { calls.push("build"); } },
    { state: "test", run: async () => { calls.push("test"); } },
    { state: "observe", run: async () => { calls.push("observe"); } },
    { state: "learn", run: async () => { calls.push("learn"); } },
  ]);

  assert.equal(result.completed, true);
  assert.equal(result.state, "completed");
  assert.deepEqual(calls, ["evaluate", "select_goal", "research", "plan", "build", "test", "observe", "learn"]);
  assert.equal(orchestrator.state, "completed");
  assert.equal((await audit.listByRun("run-execution")).at(-1)?.type, "run_completed");
});

test("execution converts step exceptions into an audited failed run when no task context exists", async () => {
  const { audit, orchestrator, execution } = createExecution();

  const result = await execution.execute([
    { state: "evaluate", run: async () => { throw new Error("research provider unavailable"); } },
  ]);

  assert.equal(result.completed, false);
  assert.equal(result.state, "failed");
  assert.equal(orchestrator.state, "failed");

  const events = await audit.listByRun("run-execution");
  assert.equal(events.at(-1)?.type, "run_failed");
  assert.equal(events.at(-1)?.message, "research provider unavailable");
});

test("execution returns retry without automatically repeating the failed step", async () => {
  const { orchestrator, execution } = createExecution();
  let attempts = 0;

  const result = await execution.execute([
    {
      state: "discover",
      taskId: "discover-task",
      run: async () => {
        attempts += 1;
        throw new Error("temporary failure");
      },
    },
  ]);

  assert.equal(attempts, 1);
  assert.equal(result.completed, false);
  assert.equal(result.state, "discover");
  assert.equal(result.recoveryAction, "retry");
  assert.equal(orchestrator.state, "discover");
});

test("execution applies learn_again recovery through the orchestrator", async () => {
  const { orchestrator, execution } = createExecution();

  for (const state of ["evaluate", "select_goal", "research", "plan", "build", "test", "observe", "learn", "propose_improvement", "wait_for_approval"] as const) {
    await orchestrator.transition(state);
  }

  const result = await execution.execute([
    {
      state: "wait_for_approval",
      taskId: "approval-task",
      run: async () => {
        throw new Error("approval denied");
      },
      classifyFailure: (error) => ({
        kind: "approval_rejected",
        message: error instanceof Error ? error.message : String(error),
        retryCount: 0,
      }),
    },
  ]);

  assert.equal(result.completed, false);
  assert.equal(result.recoveryAction, "learn_again");
  assert.equal(result.state, "learn_again");
  assert.equal(orchestrator.state, "learn_again");
});
