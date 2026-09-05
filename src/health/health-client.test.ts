import test from "node:test";
import assert from "node:assert/strict";
import type { HealthCheckRequest, HealthCheckResult, HealthClient } from "./health-client.js";

test("HealthClient contract supports a health result", async () => {
  const client: HealthClient = {
    async check(request: HealthCheckRequest): Promise<HealthCheckResult> {
      return {
        url: request.url,
        status: "unknown",
        statusCode: null,
        latencyMs: null,
      };
    },
  };

  assert.deepEqual(await client.check({ url: "https://example.com/health" }), {
    url: "https://example.com/health",
    status: "unknown",
    statusCode: null,
    latencyMs: null,
  });
});
