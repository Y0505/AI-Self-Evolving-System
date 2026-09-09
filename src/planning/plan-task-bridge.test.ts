import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicPlanTaskBridge } from "./plan-task-bridge.js";

const plan = {
  goalId: "opp-1",
  summary: "Build a support automation product.",
  steps: [
    {
      id: "step-1",
      title: "Create the support workflow",
      description: "Implement the initial workflow boundary.",
    },
    {
      id: "step-2",
      title: "Add tests",
      description: "Cover the workflow with focused tests.",
    },
  ],
};

test("bridge converts plan steps into deterministic task drafts", () => {
  const bridge = new DeterministicPlanTaskBridge();

  assert.deepEqual(bridge.createTasks(plan), [
    {
      id: "opp-1:step-1",
      goalId: "opp-1",
      planStepId: "step-1",
      title: "Create the support workflow",
      description: "Implement the initial workflow boundary.",
    },
    {
      id: "opp-1:step-2",
      goalId: "opp-1",
      planStepId: "step-2",
      title: "Add tests",
      description: "Cover the workflow with focused tests.",
    },
  ]);
});

test("bridge preserves goal and plan-step identity", () => {
  const bridge = new DeterministicPlanTaskBridge();
  const tasks = bridge.createTasks({
    ...plan,
    goalId: "opp-9",
    steps: [{ ...plan.steps[0], id: "step-9" }],
  });

  assert.equal(tasks[0].goalId, "opp-9");
  assert.equal(tasks[0].planStepId, "step-9");
  assert.equal(tasks[0].id, "opp-9:step-9");
});

test("bridge returns no tasks for an empty plan", () => {
  const bridge = new DeterministicPlanTaskBridge();

  assert.deepEqual(
    bridge.createTasks({ ...plan, steps: [] }),
    [],
  );
});
