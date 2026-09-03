import type { DeploymentClient, DeploymentRequest, DeploymentResult } from "../deployment/deployment-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface DeployInput extends DeploymentRequest {}

export const createDeployTool = (
  client: DeploymentClient,
): Tool<DeployInput, DeploymentResult> => ({
  name: "deploy",
  description:
    "Deploy an explicitly selected repository ref to an explicitly selected environment through the configured deployment provider. This is an external mutation and requires approval.",
  requiresApproval: true,
  async execute(input: DeployInput, _context: ToolContext) {
    if (!input || typeof input !== "object") {
      throw new Error("Deployment input is required");
    }
    if (typeof input.environment !== "string" || !input.environment.trim()) {
      throw new Error("Deployment environment is required");
    }
    if (typeof input.ref !== "string" || !input.ref.trim()) {
      throw new Error("Deployment ref is required");
    }
    if (input.environment.trim().startsWith("-")) {
      throw new Error("Deployment environment cannot start with '-'");
    }
    if (input.ref.trim().startsWith("-")) {
      throw new Error("Deployment ref cannot start with '-'");
    }

    return client.deploy({
      environment: input.environment.trim(),
      ref: input.ref.trim(),
    });
  },
});
