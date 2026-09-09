import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryTaskManager } from "../core/task-manager.js";
import { PlanTaskRegistrar } from "./task-registration.js";
import type { TaskDraft } from "./plan-task-bridge.js";

const drafts: TaskDraft[] = [
  {
    id: "goal-1:step-1",
    goalId: "goal-1",
    planStepId: "step-1",
    title: " Implement feature ",
    description: " Build the feature. ",
  },
  {
    id: "goal-1:step-2",
    goalId: "goal-1",
    planStepId: "step-2",
    title: "Add tests",
    description: "Add focused tests.",
  },
];

test("registers generated drafts as pending tasks with provenance", () => {
  const taskManager = new InMemoryTaskManager();
  const registrar = new PlanTaskRegistrar(taskManager);

  const tasks = registrar.register(drafts);

  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].id, "goal-1:step-1");
  assert.equal(tasks[0].title, "Implement feature");
  assert.equal(tasks[0].description, "Build the feature.");
  assert.deepEqual(tasks[0].provenance, {
    goalId: "goal-1",
    planStepId: "step-1",
  });
  assert.equal(tasks[0].status, "pending");
  assert.deepEqual(taskManager.list(), tasks);
});

test("registration does not execute tasks", () => {
  const taskManager = new InMemoryTaskManager();
  const registrar = new PlanTaskRegistrar(taskManager);

  registrar.register([drafts[0]]);

  assert.equal(taskManager.get("goal-1:step-1").status, "pending");
});

test("registers an empty draft list without creating tasks", () => {
  const taskManager = new InMemoryTaskManager();
  const registrar = new PlanTaskRegistrar(taskManager);

  assert.deepEqual(registrar.register([]), []);
  assert.deepEqual(taskManager.list(), []);
});
