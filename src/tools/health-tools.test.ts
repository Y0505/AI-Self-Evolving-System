import test from "node:test";
import assert from "node:assert/strict";
import { createHealthCheckTool } from "./health-tools.js";
import type { HealthClient } from "../health/health-client.js";

const context = {} as Parameters<ReturnType<typeof createHealthCheckTool>["execute"]>[1];

test("health_check is read-only and delegates a normalized URL", async () => {
  let received: string | undefined;
  const client: HealthClient = {
    async check(request) {
      received = request.url;
      return {
        url: request.url,
        status: "healthy",
        statusCode: 200,
        latencyMs: 42,
      };
    },
  };

  const tool = createHealthCheckTool(client);
  assert.equal(tool.requiresApproval, undefined);

  const result = await tool.execute({ url: "  https://example.com/health  " }, context);
  assert.equal(received, "https://example.com/health");
  assert.deepEqual(result, {
    url: "https://example.com/health",
    status: "healthy",
    statusCode: 200,
    latencyMs: 42,
  });
});

test("health_check rejects missing or empty URLs", async () => {
  const client: HealthClient = {
    async check() {
      throw new Error("should not be called");
    },
  };
  const tool = createHealthCheckTool(client);

  await assert.rejects(() => tool.execute({ url: "" }, context), /Health check URL is required/);
  await assert.rejects(() => tool.execute({ url: "   " }, context), /Health check URL is required/);
});

test("health_check rejects option-like URLs", async () => {
  const client: HealthClient = {
    async check() {
      throw new Error("should not be called");
    },
  };
  const tool = createHealthCheckTool(client);

  await assert.rejects(() => tool.execute({ url: "-http://example.com" }, context), /cannot start with '-'/);
});
