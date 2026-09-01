import test from "node:test";
import assert from "node:assert/strict";
import { ToolCaller } from "../../src/agent/tool-caller.js";
import { ToolRegistry } from "../../src/tools/registry.js";

const context = { workspaceRoot: "/workspace" };

test("executes a registered tool and returns its output", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "echo",
    description: "Echo input",
    async execute(input: { value: string }) {
      return input.value;
    },
  });

  const result = await new ToolCaller(registry).execute(
    { tool: "echo", input: { value: "hello" } },
    context,
  );

  assert.deepEqual(result, { tool: "echo", output: "hello" });
});

test("returns controlled errors for unknown tools", async () => {
  const result = await new ToolCaller(new ToolRegistry()).execute(
    { tool: "missing", input: {} },
    context,
  );

  assert.deepEqual(result, { tool: "missing", error: "Tool not found: missing" });
});

test("captures tool execution failures without throwing", async () => {
  const registry = new ToolRegistry();
  registry.register({
    name: "failing",
    description: "Always fails",
    async execute() {
      throw new Error("expected failure");
    },
  });

  const result = await new ToolCaller(registry).execute(
    { tool: "failing", input: {} },
    context,
  );

  assert.deepEqual(result, { tool: "failing", error: "expected failure" });
});
