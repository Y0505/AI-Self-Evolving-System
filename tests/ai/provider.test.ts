import test from "node:test";
import assert from "node:assert/strict";
import type { AIProvider } from "../../src/ai/provider.js";
import { createTask } from "../../src/core/task.js";

class FakeAIProvider implements AIProvider {
  async generate(request: Parameters<AIProvider["generate"]>[0]) {
    return {
      content: `Task received: ${request.task.title}`,
      provider: "fake",
      model: "test-model",
    };
  }
}

test("allows an AI provider to receive task and repository context", async () => {
  const provider = new FakeAIProvider();
  const task = createTask("Understand repository", "Inspect the project structure.");
  const response = await provider.generate({
    task,
    repository: {
      root: ".",
      files: 3,
      directories: 1,
      languages: { TypeScript: 2, JSON: 1 },
      testFiles: 1,
      configurationFiles: ["package.json"],
    },
  });

  assert.equal(response.provider, "fake");
  assert.equal(response.model, "test-model");
  assert.equal(response.content, "Task received: Understand repository");
});
