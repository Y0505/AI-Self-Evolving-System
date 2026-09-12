import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentLoop } from "../src/agent/agent-loop.js";
import { ToolCaller } from "../src/agent/tool-caller.js";
import { ToolRegistry } from "../src/tools/registry.js";
import { DeterministicExecutionBudget, ExecutionBudgetExceededError } from "../src/runtime/execution-budget.js";

const context = { workspaceRoot: "." };

const tool = {
  name: "echo",
  description: "Echo input",
  async execute(input: unknown) {
    return input;
  },
};

test("tool calls consume the autonomous tool-call budget", async () => {
  const registry = new ToolRegistry();
  registry.register(tool);
  const budget = new DeterministicExecutionBudget({ maxTasks: 1, maxToolCalls: 1, maxRetries: 1, maxIterations: 2 });
  const caller = new ToolCaller(registry, { budget });

  await caller.execute({ tool: "echo", input: "first" }, context);

  await assert.rejects(
    caller.execute({ tool: "echo", input: "second" }, context),
    (error: unknown) => error instanceof ExecutionBudgetExceededError && error.metric === "toolCalls",
  );
  assert.equal(budget.snapshot().toolCalls, 1);
});

test("agent iterations consume the autonomous iteration budget", async () => {
  const registry = new ToolRegistry();
  registry.register(tool);
  const budget = new DeterministicExecutionBudget({ maxTasks: 1, maxToolCalls: 5, maxRetries: 1, maxIterations: 1 });
  const caller = new ToolCaller(registry, { budget });
  const model = {
    async decide() {
      return { type: "tool_call" as const, toolCall: { tool: "echo", input: "value" } };
    },
  };
  const agent = new AgentLoop(model, caller, { maxToolCalls: 5, budget });

  await assert.rejects(
    agent.run("input", context),
    (error: unknown) => error instanceof ExecutionBudgetExceededError && error.metric === "iterations",
  );
  assert.equal(budget.snapshot().iterations, 1);
  assert.equal(budget.snapshot().toolCalls, 1);
});

test("a final model decision still consumes one iteration", async () => {
  const registry = new ToolRegistry();
  const budget = new DeterministicExecutionBudget({ maxTasks: 1, maxToolCalls: 1, maxRetries: 1, maxIterations: 1 });
  const agent = new AgentLoop(
    { async decide() { return { type: "final" as const, content: "done" }; } },
    new ToolCaller(registry, { budget }),
    { budget },
  );

  const result = await agent.run("input", context);

  assert.equal(result.content, "done");
  assert.equal(budget.snapshot().iterations, 1);
});
