import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicImplementationContextBuilder } from "./implementation-context.js";

const goal = {
  opportunityId: "opportunity-1",
  goal: "Build a useful MVP",
};

const research = {
  goalId: "opportunity-1",
  summary: "Research summary",
  findings: [],
};

const plan = {
  goalId: "opportunity-1",
  summary: "Plan summary",
  steps: [{ id: "step-1", title: "Implement", description: "Implement the MVP" }],
};

const task = {
  id: "opportunity-1:step-1",
  goalId: "opportunity-1",
  planStepId: "step-1",
  title: "Implement",
  description: "Implement the MVP",
  status: "pending" as const,
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
    () => new DeterministicImplementationContextBuilder().build({ ...{ goal, plan, task }, research: { ...research, goalId: "other" } }),
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
