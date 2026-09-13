import assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryAutonomousRunEventStore } from "../src/runtime/autonomous-run-audit.js";
import { ControlledAutonomousMvpRunner } from "../src/mvp/autonomous-mvp-runner.js";
import type { MvpRunResult } from "../src/mvp/mvp-runner.js";
import { ControlledAutonomousRunOrchestrator } from "../src/runtime/autonomous-run-orchestrator.js";
import { DeterministicAutonomousRunRecoveryPolicy } from "../src/runtime/autonomous-run-recovery.js";
import { ControlledAutonomousRunStateMachine } from "../src/runtime/autonomous-run-state-machine.js";
import { DeterministicExecutionBudget } from "../src/runtime/execution-budget.js";

const createOrchestrator = (runId: string) => {
  const audit = new InMemoryAutonomousRunEventStore();
  const orchestrator = new ControlledAutonomousRunOrchestrator(runId, {
    stateMachine: new ControlledAutonomousRunStateMachine(),
    budget: new DeterministicExecutionBudget({ maxTasks: 2, maxToolCalls: 4, maxRetries: 1, maxIterations: 5 }),
    audit,
    recovery: new DeterministicAutonomousRunRecoveryPolicy(1),
    now: () => "2026-01-01T00:00:00.000Z",
    createEventId: (() => {
      let counter = 0;
      return () => `${runId}-event-${++counter}`;
    })(),
  });
  return { audit, orchestrator };
};

const result = (improvementProposals: MvpRunResult["improvementProposals"] = []): MvpRunResult => ({
  selectedGoal: null,
  evaluation: null,
  research: null,
  plan: null,
  tasks: [],
  executions: [],
  learning: null,
  improvementProposals,
});

test("integrates the deterministic MVP loop into the autonomous lifecycle", async () => {
  const { audit, orchestrator } = createOrchestrator("mvp-complete");
  const runner = new ControlledAutonomousMvpRunner(
    { run: async () => result() },
    orchestrator,
  );

  const execution = await runner.run([]);

  assert.equal(execution.completed, true);
  assert.equal(execution.state, "completed");
  assert.deepEqual((await audit.listByRun("mvp-complete")).filter((event) => event.type === "state_transition").map((event) => event.state), [
    "evaluate",
    "select_goal",
    "research",
    "plan",
    "build",
    "test",
    "observe",
    "learn",
    "completed",
  ]);
});

test("pauses at improvement proposal instead of executing it automatically", async () => {
  const { audit, orchestrator } = createOrchestrator("mvp-improvement");
  const runner = new ControlledAutonomousMvpRunner(
    { run: async () => result([{ id: "proposal-1", title: "Review failure pattern", rationale: "failure evidence", evidence: { totalRecords: 1, failures: 1, successRate: null }, status: "proposed" }]) },
    orchestrator,
  );

  const execution = await runner.run([]);

  assert.equal(execution.completed, false);
  assert.equal(execution.state, "propose_improvement");
  assert.equal((await audit.listByRun("mvp-improvement")).at(-1)?.state, "propose_improvement");
});

test("fails the autonomous run when the MVP boundary throws", async () => {
  const { audit, orchestrator } = createOrchestrator("mvp-failure");
  const runner = new ControlledAutonomousMvpRunner(
    { run: async () => { throw new Error("MVP execution failed"); } },
    orchestrator,
  );

  await assert.rejects(runner.run([]), /MVP execution failed/);
  assert.equal(orchestrator.state, "failed");
  assert.equal((await audit.listByRun("mvp-failure")).at(-1)?.message, "MVP execution failed");
});
