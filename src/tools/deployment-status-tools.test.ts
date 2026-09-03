import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DeploymentStatusClient, DeploymentStatusRequest } from "../deployment/deployment-status-client.js";
import { createDeploymentStatusTool } from "./deployment-status-tools.js";

class FakeDeploymentStatusClient implements DeploymentStatusClient {
  requests: DeploymentStatusRequest[] = [];

  async get(request: DeploymentStatusRequest) {
    this.requests.push(request);
    return {
      deploymentId: request.deploymentId,
      environment: "production",
      ref: "main",
      status: "success" as const,
      url: "https://example.test",
    };
  }
}

describe("deployment status tool", () => {
  it("is read-only and does not require approval", () => {
    const tool = createDeploymentStatusTool(new FakeDeploymentStatusClient());
    assert.equal(tool.requiresApproval, undefined);
  });

  it("validates deployment ID", async () => {
    const tool = createDeploymentStatusTool(new FakeDeploymentStatusClient());
    await assert.rejects(
      () => tool.execute({ deploymentId: "" }, { workspaceRoot: "/tmp" }),
      /Deployment ID is required/,
    );
    await assert.rejects(
      () => tool.execute({ deploymentId: "-dep-1" }, { workspaceRoot: "/tmp" }),
      /Deployment ID cannot start/,
    );
  });

  it("delegates the normalized deployment ID", async () => {
    const client = new FakeDeploymentStatusClient();
    const tool = createDeploymentStatusTool(client);
    const result = await tool.execute({ deploymentId: " dep-1 " }, { workspaceRoot: "/tmp" });

    assert.deepEqual(client.requests, [{ deploymentId: "dep-1" }]);
    assert.equal(result.status, "success");
    assert.equal(result.url, "https://example.test");
  });
});
