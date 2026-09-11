import test from "node:test";
import assert from "node:assert/strict";
import {
  DeterministicExecutionBudget,
  ExecutionBudgetExceededError,
} from "./execution-budget.js";

const limits = {
  maxTasks: 2,
  maxToolCalls: 3,
  maxRetries: 1,
  maxIterations: 4,
};

test("budget tracks each metric independently", () => {
  const budget = new DeterministicExecutionBudget(limits);
  budget.consume("tasks");
  budget.consume("toolCalls", 2);
  budget.consume("retries");

  assert.deepEqual(budget.snapshot(), {
    tasks: 1,
    toolCalls: 2,
    retries: 1,
    iterations: 0,
  });
  assert.equal(budget.remaining("tasks"), 1);
  assert.equal(budget.remaining("toolCalls"), 1);
});

test("budget rejects consumption beyond a limit without changing the count", () => {
  const budget = new DeterministicExecutionBudget(limits);
  budget.consume("tasks", 2);

  assert.throws(
    () => budget.consume("tasks"),
    (error: unknown) =>
      error instanceof ExecutionBudgetExceededError &&
      error.metric === "tasks" &&
      error.limit === 2,
  );
  assert.equal(budget.snapshot().tasks, 2);
});

test("budget accepts exact limits", () => {
  const budget = new DeterministicExecutionBudget(limits);
  budget.consume("tasks", 2);
  budget.consume("toolCalls", 3);
  budget.consume("retries");
  budget.consume("iterations", 4);

  assert.deepEqual(budget.snapshot(), {
    tasks: 2,
    toolCalls: 3,
    retries: 1,
    iterations: 4,
  });
});

test("budget rejects invalid limits and consumption amounts", () => {
  assert.throws(
    () => new DeterministicExecutionBudget({ ...limits, maxTasks: -1 }),
    /maxTasks must be a non-negative integer/,
  );

  const budget = new DeterministicExecutionBudget(limits);
  assert.throws(() => budget.consume("tasks", 0), /positive integer/);
  assert.throws(() => budget.consume("tasks", 1.5), /positive integer/);
});
