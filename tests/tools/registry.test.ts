import test from "node:test";
import assert from "node:assert/strict";
import { ToolRegistry } from "../../src/tools/registry.js";
import type { Tool } from "../../src/tools/tool.js";

const tool: Tool<{ value: string }, string> = {
  name: "echo",
  description: "Returns the supplied value",
  async execute(input) {
    return input.value;
  },
};

test("registers and retrieves tools", () => {
  const registry = new ToolRegistry();
  registry.register(tool);

  assert.deepEqual(registry.list(), ["echo"]);
  assert.equal(registry.get("echo"), tool);
});

test("rejects duplicate and unknown tools", () => {
  const registry = new ToolRegistry();
  registry.register(tool);

  assert.throws(() => registry.register(tool), /Tool already registered/);
  assert.throws(() => registry.get("missing"), /Tool not found/);
});
