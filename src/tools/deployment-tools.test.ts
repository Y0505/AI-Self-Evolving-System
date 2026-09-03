import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DeploymentClient, DeploymentRequest } from "../deployment/deployment-client.js";
import { createDeployTool } from "./deployment-tools.js";

class FakeDeploymentClient implements DeploymentClient {
  requests: DeploymentRequest[] = [];

  async deploy(request: DeploymentRequest) {
    this.requests.push(request);
    return {
      deploymentId: "dep-1",
      environment: request.environment,
      ref: request.ref,
      status: "queued" as const,
      url: null,
    };
  }
}

describe("deploy tool", () => {
  it("requires approval", () => {
    const client = new FakeDeploymentClient();
    const tool = createDeployTool(client);
    assert.equal(tool.requiresApproval, true);
  });

  it("validates environment and ref", async () => {
    const tool = createDeployTool(new FakeDeploymentClient());
    await assert.rejects(
      () => tool.execute({ environment: "", ref: "main" }, { workspaceRoot: "/tmp" }),
      /environment is required/,
    );
    await assert.rejects(
      () => tool.execute({ environment: "production", ref: "" }, { workspaceRoot: "/tmp" }),
      /ref is required/,
    );
    await assert.rejects(
      () => tool.execute({ environment: "-production", ref: "main" }, { workspaceRoot: "/tmp" }),
      /environment cannot start/,
    );
    await assert.rejects(
      () => tool.execute({ environment: "production", ref: "-main" }, { workspaceRoot: "/tmp" }),
      /ref cannot start/,
    );
  });

  it("delegates only validated values to the provider", async () => {
    const client = new FakeDeploymentClient();
    const tool = createDeployTool(client);
    const result = await tool.execute(
      { environment: " production ", ref: " main " },
      { workspaceRoot: "/tmp" },
    );

    assert.deepEqual(client.requests, [{ environment: "production", ref: "main" }]);
    assert.equal(result.deploymentId, "dep-1");
    assert.equal(result.status, "queued");
  });
});
