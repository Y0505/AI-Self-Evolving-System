import test from "node:test";
import assert from "node:assert/strict";
import { createTask } from "../../src/core/task.js";
import { InMemoryTaskManager } from "../../src/core/task-manager.js";

test("stores, updates, retrieves, and filters tasks", () => {
  const manager = new InMemoryTaskManager();
  const task = createTask("Implement feature", "Add the feature safely");

  manager.add(task);
  assert.deepEqual(manager.get(task.id), task);

  const running = manager.update(task.id, { status: "running" });
  assert.equal(running.status, "running");

  manager.update(task.id, { status: "failed", error: "Test failed" });
  assert.equal(manager.list("failed").length, 1);
  assert.equal(manager.list("pending").length, 0);
  assert.equal(manager.get(task.id).error, "Test failed");
});

test("rejects duplicate tasks and unknown task ids", () => {
  const manager = new InMemoryTaskManager();
  const task = createTask("Task", "Description");

  manager.add(task);
  assert.throws(() => manager.add(task), /Task already exists/);
  assert.throws(() => manager.get("missing"), /Task not found/);
  assert.throws(() => manager.update("missing", { status: "running" }), /Task not found/);
});
