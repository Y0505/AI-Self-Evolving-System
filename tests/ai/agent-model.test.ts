import assert from "node:assert/strict";
import test from "node:test";

import { ProviderAgentModel } from "../../src/ai/agent-model.js";
import type { AIRequest, AIResponse } from "../../src/ai/provider.js";
import type { Task } from "../../src/core/task.js";
import type { RepositorySnapshot } from "../../src/repository/scanner.js";

const task: Task = {
  id: "task-1",
  title: "Inspect repository",
  description: "Understand the repository structure",
  status: "pending",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const repository: RepositorySnapshot = {
  root: "/workspace",
  files: 4,
  directories: 2,
  languages: { TypeScript: 3, JSON: 1 },
  testFiles: 1,
  configurationFiles: ["package.json"],
};

function createProvider(response: string, requests: AIRequest[]): { generate(request: AIRequest): Promise<AIResponse> } {
  return {
    async generate(request) {
      requests.push(request);
      return { content: response, provider: "test-provider", model: "test-model" };
    },
  };
}

test("ProviderAgentModel maps a provider response to a final decision", async () => {
  const requests: AIRequest[] = [];
  const model = new ProviderAgentModel({
    provider: createProvider('{"type":"final","content":"Done"}', requests),
    task,
    repository,
    instructions: "Be concise",
  });

  const decision = await model.decide("Inspect the repository", []);

  assert.deepEqual(decision, { type: "final", content: "Done" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].task.id, task.id);
  assert.equal(requests[0].repository.root, repository.root);
  assert.match(requests[0].instructions ?? "", /Be concise/);
  assert.match(requests[0].instructions ?? "", /Current agent input: Inspect the repository/);
  assert.match(requests[0].instructions ?? "", /Available tools: read_file, write_file, remove_file, run_tests/);
  assert.match(requests[0].instructions ?? "", /run_tests tool accepts/);
  assert.match(requests[0].instructions ?? "", /Tool result history/);
});

test("ProviderAgentModel maps a provider response to a tool call", async () => {
  const model = new ProviderAgentModel({
    provider: createProvider(
      '```json\n{"type":"tool_call","toolCall":{"tool":"read_file","input":{"path":"README.md"}}}\n```',
      [],
    ),
    task,
    repository,
  });

  const decision = await model.decide("Read the README", []);

  assert.deepEqual(decision, {
    type: "tool_call",
    toolCall: { tool: "read_file", input: { path: "README.md" } },
  });
});

test("ProviderAgentModel includes tool history in the next provider request", async () => {
  const requests: AIRequest[] = [];
  const model = new ProviderAgentModel({
    provider: createProvider('{"type":"final","content":"Finished"}', requests),
    task,
    repository,
  });

  await model.decide("Continue", [{ tool: "read_file", output: "hello" }]);

  assert.match(requests[0].instructions ?? "", /Current agent input: Continue/);
  assert.match(requests[0].instructions ?? "", /read_file/);
  assert.match(requests[0].instructions ?? "", /hello/);
});

test("ProviderAgentModel rejects malformed provider output", async () => {
  const model = new ProviderAgentModel({
    provider: createProvider("I do not return JSON", []),
    task,
    repository,
  });

  await assert.rejects(
    model.decide("Continue", []),
    /invalid agent decision/,
  );
});
