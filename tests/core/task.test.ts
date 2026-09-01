import test from "node:test";
import assert from "node:assert/strict";
import { createTask } from "../../src/core/task.js";
import { NoopTaskExecutor } from "../../src/core/execution.js";

test("creates a pending task", () => {
  const task = createTask("Inspect repository", "Understand the repository structure.");

  assert.equal(task.title, "Inspect repository");
  assert.equal(task.status, "pending");
  assert.ok(task.id);
});

test("rejects an empty task title", () => {
  assert.throws(() => createTask("   ", "Description"), /Task title cannot be empty/);
});

test("executes a task through the minimal executor", async () => {
  const task = createTask("Example task", "A safe execution test.");
  const result = await new NoopTaskExecutor().execute(task);

  assert.equal(result.taskId, task.id);
  assert.equal(result.status, "completed");
});
