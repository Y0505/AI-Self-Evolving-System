import assert from "node:assert/strict";
import test from "node:test";
import { AgentLoop, type AgentDecision } from "./agent-loop.js";
import { ToolCaller } from "./tool-caller.js";
import { ToolRegistry } from "../tools/registry.js";
import type { ToolContext } from "../tools/tool.js";

const context: ToolContext = { workspaceRoot: "/tmp/disposable" };

function createToolCaller(output = "ok", error = false): ToolCaller {
  const registry = new ToolRegistry();
  registry.register({
    name: "probe",
    description: "Test probe tool",
    async execute() {
      if (error) throw new Error("probe failed");
      return output;
    },
  });
  return new ToolCaller(registry);
}

function sequenceModel(decisions: AgentDecision[]) {
  let index = 0;
  return {
    async decide() {
      const decision = decisions[Math.min(index++, decisions.length - 1)];
      return decision;
    },
  };
}

const probeCall = { tool: "probe", input: { value: 1 } };

 test("allows a successful run when guards are not triggered", async () => {
  const loop = new AgentLoop(
    sequenceModel([{ type: "tool_call", toolCall: probeCall }, { type: "final", content: "done" }]),
    createToolCaller(),
    { maxToolCalls: 3, maxConsecutiveToolErrors: 2, maxRepeatedToolCalls: 2 },
  );

  const result = await loop.run("work", context);

  assert.equal(result.content, "done");
  assert.equal(result.toolResults.length, 1);
});

test("stops repeated identical tool calls deterministically", async () => {
  const loop = new AgentLoop(
    sequenceModel([
      { type: "tool_call", toolCall: probeCall },
      { type: "tool_call", toolCall: probeCall },
      { type: "tool_call", toolCall: probeCall },
    ]),
    createToolCaller(),
    { maxToolCalls: 5, maxRepeatedToolCalls: 2 },
  );

  await assert.rejects(() => loop.run("work", context), {
    message: "Agent repeated the same tool call too many times: probe",
  });
});

test("stops consecutive tool errors deterministically", async () => {
  const loop = new AgentLoop(
    sequenceModel([
      { type: "tool_call", toolCall: probeCall },
      { type: "tool_call", toolCall: { tool: "probe", input: { value: 2 } } },
    ]),
    createToolCaller("ok", true),
    { maxToolCalls: 5, maxConsecutiveToolErrors: 2 },
  );

  await assert.rejects(() => loop.run("work", context), {
    message: "Agent exceeded maximum consecutive tool errors: 2",
  });
});

test("preserves the existing maximum tool-call boundary", async () => {
  const loop = new AgentLoop(
    sequenceModel([{ type: "tool_call", toolCall: probeCall }]),
    createToolCaller(),
    { maxToolCalls: 2 },
  );

  await assert.rejects(() => loop.run("work", context), {
    message: "Agent exceeded maximum tool calls: 2",
  });
});

test("rejects invalid guard limits", () => {
  assert.throws(
    () => new AgentLoop(sequenceModel([{ type: "final", content: "done" }]), createToolCaller(), { maxRepeatedToolCalls: 0 }),
    { message: "maxRepeatedToolCalls must be a positive integer" },
  );

  assert.throws(
    () => new AgentLoop(sequenceModel([{ type: "final", content: "done" }]), createToolCaller(), { maxConsecutiveToolErrors: 1.5 }),
    { message: "maxConsecutiveToolErrors must be a positive integer" },
  );
});
