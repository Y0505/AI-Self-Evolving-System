import type { DeploymentStatusClient, DeploymentStatusRequest, DeploymentStatusResult } from "../deployment/deployment-status-client.js";
import type { Tool, ToolContext } from "./tool.js";

export interface DeploymentStatusInput extends DeploymentStatusRequest {}

export const createDeploymentStatusTool = (
  client: DeploymentStatusClient,
): Tool<DeploymentStatusInput, DeploymentStatusResult> => ({
  name: "deployment_status",
  description: "Observe the status of an existing deployment through the configured deployment provider. This is read-only and does not require approval.",
  async execute(input: DeploymentStatusInput, _context: ToolContext) {
    if (!input || typeof input !== "object") {
      throw new Error("Deployment status input is required");
    }
    if (typeof input.deploymentId !== "string" || !input.deploymentId.trim()) {
      throw new Error("Deployment ID is required");
    }
    if (input.deploymentId.trim().startsWith("-")) {
      throw new Error("Deployment ID cannot start with '-'");
    }

    return client.get({ deploymentId: input.deploymentId.trim() });
  },
});
