import assert from "node:assert/strict";
import test from "node:test";

import { OpenAICompatibleProvider } from "../../src/ai/openai-compatible-provider.js";
import type { AIRequest } from "../../src/ai/provider.js";

const request: AIRequest = {
  task: {
    id: "task-1",
    title: "Inspect repository",
    description: "Understand the repository",
    status: "pending",
    createdAt: "2026-09-01T00:00:00.000Z",
  },
  repository: {
    root: "/workspace",
    files: 4,
    directories: 2,
    languages: { TypeScript: 3, JSON: 1 },
    testFiles: 1,
    configurationFiles: ["package.json"],
  },
  instructions: "Return a concise answer.",
};

test("OpenAICompatibleProvider sends an OpenAI-compatible chat request", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  const provider = new OpenAICompatibleProvider({
    endpoint: "http://localhost:11434/v1/",
    model: "test-model",
    apiKey: "test-key",
    fetch: async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "hello" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });

  const result = await provider.generate(request);
  const body = JSON.parse(String(capturedInit?.body)) as {
    model: string;
    messages: Array<{ role: string; content: string }>;
  };

  assert.equal(capturedUrl, "http://localhost:11434/v1/chat/completions");
  assert.equal(capturedInit?.method, "POST");
  assert.equal((capturedInit?.headers as Record<string, string>).Authorization, "Bearer test-key");
  assert.equal(body.model, "test-model");
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[0].content, /Repository files: 4/);
  assert.match(body.messages[0].content, /Return a concise answer/);
  assert.equal(body.messages[1].role, "user");
  assert.equal(body.messages[1].content, request.task.description);
  assert.deepEqual(result, {
    content: "hello",
    provider: "openai-compatible",
    model: "test-model",
  });
});

test("OpenAICompatibleProvider supports endpoints without an API key", async () => {
  let capturedInit: RequestInit | undefined;

  const provider = new OpenAICompatibleProvider({
    endpoint: "http://localhost:1234/v1",
    model: "local-model",
    fetch: async (_url, init) => {
      capturedInit = init;
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "local" } }] }),
        { status: 200 },
      );
    },
  });

  const result = await provider.generate(request);
  const headers = capturedInit?.headers as Record<string, string>;

  assert.equal(headers.Authorization, undefined);
  assert.equal(result.content, "local");
});

test("OpenAICompatibleProvider reports HTTP failures", async () => {
  const provider = new OpenAICompatibleProvider({
    endpoint: "http://localhost:1234/v1",
    model: "test-model",
    fetch: async () => new Response("bad gateway", { status: 502, statusText: "Bad Gateway" }),
  });

  await assert.rejects(
    provider.generate(request),
    /AI provider request failed: 502 Bad Gateway/,
  );
});

test("OpenAICompatibleProvider rejects responses without content", async () => {
  const provider = new OpenAICompatibleProvider({
    endpoint: "http://localhost:1234/v1",
    model: "test-model",
    fetch: async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }),
  });

  await assert.rejects(
    provider.generate(request),
    /AI provider returned no message content/,
  );
});
