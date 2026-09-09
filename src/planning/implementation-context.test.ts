import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicImplementationContextBuilder } from "./implementation-context.js";
import type { SelectedGoal } from "../opportunity/goal-selector.js";
import type { ResearchResult } from "../research/research-client.js";
import type { PlanningResult } from "./planning-client.js";
import type { Task } from "../core/task.js";

const goal: SelectedGoal = {
  opportunityId: "opportunity-1",
  title: "Build a useful MVP",
  problem: "A validated problem needs an implementation.",
  score: 80,
  rank: "high",
  rationale: "Selected deterministically.",
};

const research: ResearchResult = {
  goalId: "opportunity-1",
  summary: "Research summary",
  findings: [],
};

const plan: PlanningResult = {
  goalId: "opportunity-1",
  summary: "Plan summary",
  steps: [{ id: "step-1", title: "Implement", description: "Implement the MVP" }],
};

const task: Task = {
  id: "opportunity-1:step-1",
  title: "Implement",
  description: "Implement the MVP",
  status: "pending",
  createdAt: new Date().toISOString(),
  provenance: { goalId: "opportunity-1", planStepId: "step-1" },
};

test("builds context without executing the task", () => {
  const context = new DeterministicImplementationContextBuilder().build({ goal, research, plan, task });

  assert.equal(context.goal.opportunityId, "opportunity-1");
  assert.equal(context.research.goalId, "opportunity-1");
  assert.equal(context.plan.goalId, "opportunity-1");
  assert.equal(context.task.status, "pending");
  assert.deepEqual(context.task.provenance, { goalId: "opportunity-1", planStepId: "step-1" });
});

test("rejects mismatched research", () => {
  assert.throws(
    () => new DeterministicImplementationContextBuilder().build({ goal, plan, task, research: { ...research, goalId: "other" } }),
    /does not match research/,
  );
});

test("rejects mismatched task provenance", () => {
  assert.throws(
    () => new DeterministicImplementationContextBuilder().build({
      goal,
      research,
      plan,
      task: { ...task, provenance: { goalId: "other", planStepId: "step-1" } },
    }),
    /does not match task provenance/,
  );
});
