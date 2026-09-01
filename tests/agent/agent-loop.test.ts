import test from "node:test";
import assert from "node:assert/strict";
import { AgentLoop, type AgentModel } from "../../src/agent/agent-loop.js";
import { ToolCaller } from "../../src/agent/tool-caller.js";
import { ToolRegistry } from "../../src/tools/registry.js";

const context = { workspaceRoot: "/workspace" };

test("runs tool calls until the model returns a final answer", async () => {
  let step = 0;
  const model: AgentModel = {
    async decide() {
      step += 1;
      if (step === 1) return { type: "tool_call", toolCall: { tool: "echo", input: { value: "hello" } } };
      return { type: "final", content: "Done" };
    },
  };

  const registry = new ToolRegistry();
  registry.register({
    name: "echo",
    description: "Echo input",
    async execute(input: { value: string }) {
      return input.value;
    },
  });

  const result = await new AgentLoop(model, new ToolCaller(registry)).run("Inspect repository", context);
  assert.equal(result.content, "Done");
  assert.deepEqual(result.toolResults, [{ tool: "echo", output: "hello" }]);
});

test("enforces a maximum number of tool calls", async () => {
  const model: AgentModel = {
    async decide() {
      return { type: "tool_call", toolCall: { tool: "echo", input: {} } };
    },
  };
  const registry = new ToolRegistry();
  registry.register({ name: "echo", description: "Echo", async execute() { return "ok"; } });

  await assert.rejects(
    new AgentLoop(model, new ToolCaller(registry), { maxToolCalls: 2 }).run("loop", context),
    /exceeded maximum tool calls: 2/,
  );
});

test("rejects malformed tool-call decisions", async () => {
  const model: AgentModel = {
    async decide() {
      return { type: "tool_call" };
    },
  };

  await assert.rejects(
    new AgentLoop(model, new ToolCaller(new ToolRegistry())).run("bad decision", context),
    /without a tool call/,
  );
});
