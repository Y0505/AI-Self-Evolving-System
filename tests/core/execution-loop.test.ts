import test from "node:test";
import assert from "node:assert/strict";
import { createTask } from "../../src/core/task.js";
import { InMemoryTaskManager } from "../../src/core/task-manager.js";
import type { TaskExecutor, ExecutionResult } from "../../src/core/execution.js";
import { TaskExecutionLoop } from "../../src/core/execution-loop.js";

class SuccessfulExecutor implements TaskExecutor {
  async execute(task: Parameters<TaskExecutor["execute"]>[0]): Promise<ExecutionResult> {
    return { taskId: task.id, status: "completed", message: "done" };
  }
}

class FailingExecutor implements TaskExecutor {
  async execute(task: Parameters<TaskExecutor["execute"]>[0]): Promise<ExecutionResult> {
    return { taskId: task.id, status: "failed", message: "execution failed" };
  }
}

class ThrowingExecutor implements TaskExecutor {
  async execute(task: Parameters<TaskExecutor["execute"]>[0]): Promise<ExecutionResult> {
    void task;
    throw new Error("unexpected failure");
  }
}

test("runs a pending task and records completion", async () => {
  const manager = new InMemoryTaskManager();
  const task = manager.add(createTask("Build feature", "Implement it"));
  const loop = new TaskExecutionLoop(manager, new SuccessfulExecutor());

  const result = await loop.run(task.id);

  assert.equal(result.status, "completed");
  assert.equal(manager.get(task.id).status, "completed");
  assert.equal(manager.get(task.id).result, "done");
});

test("records executor failures", async () => {
  const manager = new InMemoryTaskManager();
  const task = manager.add(createTask("Build feature", "Implement it"));
  const loop = new TaskExecutionLoop(manager, new FailingExecutor());

  await loop.run(task.id);

  assert.equal(manager.get(task.id).status, "failed");
  assert.equal(manager.get(task.id).error, "execution failed");
});

test("converts thrown executor errors into failed tasks", async () => {
  const manager = new InMemoryTaskManager();
  const task = manager.add(createTask("Build feature", "Implement it"));
  const loop = new TaskExecutionLoop(manager, new ThrowingExecutor());

  const result = await loop.run(task.id);

  assert.equal(result.status, "failed");
  assert.equal(result.message, "unexpected failure");
  assert.equal(manager.get(task.id).status, "failed");
  assert.equal(manager.get(task.id).error, "unexpected failure");
});

test("does not execute a task twice", async () => {
  const manager = new InMemoryTaskManager();
  const task = manager.add(createTask("Build feature", "Implement it"));
  const loop = new TaskExecutionLoop(manager, new SuccessfulExecutor());

  await loop.run(task.id);

  await assert.rejects(() => loop.run(task.id), /Task is not pending/);
});
