import type { HealthCheckRequest, HealthCheckResult, HealthClient } from "../health/health-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface HealthCheckInput extends HealthCheckRequest {}

export const createHealthCheckTool = (
  client: HealthClient,
): Tool<HealthCheckInput, HealthCheckResult> => ({
  name: "health_check",
  description: "Observe the health of a deployed service through the configured health provider. This is read-only and does not require approval.",
  async execute(input: HealthCheckInput, _context: ToolContext) {
    if (!input || typeof input !== "object") {
      throw new Error("Health check input is required");
    }
    if (typeof input.url !== "string" || !input.url.trim()) {
      throw new Error("Health check URL is required");
    }

    const url = input.url.trim();
    if (url.startsWith("-")) {
      throw new Error("Health check URL cannot start with '-'");
    }

    return client.check({ url });
  },
});
