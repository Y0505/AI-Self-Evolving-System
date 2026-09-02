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

test("blocks approval-required tools when no approval service is configured", async () => {
  const registry = new ToolRegistry();
  let executed = false;
  registry.register({
    name: "sensitive",
    description: "Sensitive action",
    requiresApproval: true,
    async execute() {
      executed = true;
      return "done";
    },
  });

  const result = await new ToolCaller(registry).execute(
    { tool: "sensitive", input: { value: "commit" } },
    context,
  );

  assert.deepEqual(result, {
    tool: "sensitive",
    error: "Approval required for tool: sensitive",
  });
  assert.equal(executed, false);
});

test("requests approval before executing approval-required tools", async () => {
  const registry = new ToolRegistry();
  const requests: Array<{ tool: string; input: unknown }> = [];
  let executed = false;
  registry.register({
    name: "sensitive",
    description: "Sensitive action",
    requiresApproval: true,
    async execute() {
      executed = true;
      return "done";
    },
  });

  const result = await new ToolCaller(registry).execute(
    { tool: "sensitive", input: { value: "commit" } },
    {
      workspaceRoot: "/workspace",
      approval: {
        async requestApproval(request) {
          requests.push(request);
          return true;
        },
      },
    },
  );

  assert.deepEqual(result, { tool: "sensitive", output: "done" });
  assert.deepEqual(requests, [{ tool: "sensitive", input: { value: "commit" } }]);
  assert.equal(executed, true);
});

test("does not execute approval-required tools when approval is denied", async () => {
  const registry = new ToolRegistry();
  let executed = false;
  registry.register({
    name: "sensitive",
    description: "Sensitive action",
    requiresApproval: true,
    async execute() {
      executed = true;
      return "done";
    },
  });

  const result = await new ToolCaller(registry).execute(
    { tool: "sensitive", input: {} },
    {
      workspaceRoot: "/workspace",
      approval: {
        async requestApproval() {
          return false;
        },
      },
    },
  );

  assert.deepEqual(result, {
    tool: "sensitive",
    error: "Tool execution not approved: sensitive",
  });
  assert.equal(executed, false);
});
