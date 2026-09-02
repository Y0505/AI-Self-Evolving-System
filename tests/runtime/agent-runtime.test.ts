import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { AIRequest, AIResponse } from "../../src/ai/provider.js";
import { AgentRuntime } from "../../src/runtime/agent-runtime.js";
import type { Task } from "../../src/core/task.js";

const task: Task = {
  id: "runtime-task",
  title: "Inspect repository",
  description: "Inspect the repository and report the result",
  status: "pending",
  createdAt: "2026-09-02T00:00:00.000Z",
};

function createProvider(responses: string[], requests: AIRequest[]): { generate(request: AIRequest): Promise<AIResponse> } {
  let index = 0;
  return {
    async generate(request) {
      requests.push(request);
      return {
        content: responses[index++] ?? '{"type":"final","content":"No response"}',
        provider: "test-provider",
      };
    },
  };
}

test("AgentRuntime scans the repository and executes registered file tools", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-runtime-"));
  await writeFile(join(root, "README.md"), "hello runtime", "utf8");

  const requests: AIRequest[] = [];
  const provider = createProvider(
    [
      '{"type":"tool_call","toolCall":{"tool":"read_file","input":{"path":"README.md"}}}',
      '{"type":"final","content":"Repository inspected"}',
    ],
    requests,
  );

  const runtime = new AgentRuntime({ repositoryRoot: root, provider });
  const result = await runtime.run(task, "Inspect README.md");

  assert.equal(result.content, "Repository inspected");
  assert.equal(result.toolResults.length, 1);
  assert.equal(result.toolResults[0].output, "hello runtime");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].repository.files, 1);
  assert.match(requests[0].instructions ?? "", /Tool result history/);
});

test("AgentRuntime allows the agent to modify the workspace through tools", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-runtime-"));
  const requests: AIRequest[] = [];
  const provider = createProvider(
    [
      '{"type":"tool_call","toolCall":{"tool":"write_file","input":{"path":"generated.txt","content":"created by agent"}}}',
      '{"type":"final","content":"File created"}',
    ],
    requests,
  );

  const runtime = new AgentRuntime({ repositoryRoot: root, provider });
  const result = await runtime.run(task, "Create generated.txt");

  assert.equal(result.content, "File created");
  assert.equal(await readFile(join(root, "generated.txt"), "utf8"), "created by agent");
  assert.equal(result.toolResults[0].error, undefined);
});
