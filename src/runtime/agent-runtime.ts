import type { AIProvider } from "../ai/provider.js";
import { ProviderAgentModel } from "../ai/agent-model.js";
import { AgentLoop, type AgentRunResult } from "../agent/agent-loop.js";
import { ToolCaller } from "../agent/tool-caller.js";
import type { Task } from "../core/task.js";
import { RepositoryScanner } from "../repository/scanner.js";
import { RepositoryWorkspace } from "../repository/workspace.js";
import { ToolRegistry } from "../tools/registry.js";
import type { ToolApprovalService } from "../tools/approval.js";
import { createReadFileTool, createRemoveFileTool, createWriteFileTool } from "../tools/file-tools.js";
import { createRunTestsTool } from "../tools/test-runner.js";
import { createGitBranchesTool, createGitCheckoutTool, createGitCommitTool, createGitCreateBranchTool, createGitDiffTool, createGitPushTool, createGitStageTool, createGitStatusTool, createGitUnstageTool } from "../tools/git-tools.js";
import type { PullRequestClient } from "../github/pull-request-client.js";
import { createGitHubPullRequestTool } from "../tools/github-tools.js";
import type { PullRequestStatusClient } from "../github/pull-request-status-client.js";
import { createGitHubPullRequestStatusTool } from "../tools/github-status-tools.js";
import type { PullRequestChecksClient } from "../github/pull-request-checks-client.js";
import { createGitHubPullRequestChecksTool } from "../tools/github-checks-tools.js";
import type { PullRequestReviewsClient } from "../github/pull-request-reviews-client.js";
import { createGitHubPullRequestReviewsTool } from "../tools/github-review-tools.js";
import type { PullRequestMergeClient } from "../github/pull-request-merge-client.js";
import { StrictMergeGate } from "../github/strict-merge-gate.js";
import { createGitHubMergePullRequestTool } from "../tools/github-merge-tools.js";
import type { DeploymentClient } from "../deployment/deployment-client.js";
import { createDeployTool } from "../tools/deployment-tools.js";
import type { DeploymentStatusClient } from "../deployment/deployment-status-client.js";
import { createDeploymentStatusTool } from "../tools/deployment-status-tools.js";

export interface AgentRuntimeOptions {
  repositoryRoot: string;
  provider: AIProvider;
  instructions?: string;
  maxToolCalls?: number;
  testTimeoutMs?: number;
  approval?: ToolApprovalService;
  pullRequestClient?: PullRequestClient;
  pullRequestStatusClient?: PullRequestStatusClient;
  pullRequestChecksClient?: PullRequestChecksClient;
  pullRequestReviewsClient?: PullRequestReviewsClient;
  pullRequestMergeClient?: PullRequestMergeClient;
  deploymentClient?: DeploymentClient;
  deploymentStatusClient?: DeploymentStatusClient;
}

export class AgentRuntime {
  private readonly repositoryRoot: string;
  private readonly provider: AIProvider;
  private readonly instructions?: string;
  private readonly maxToolCalls?: number;
  private readonly testTimeoutMs?: number;
  private readonly approval?: ToolApprovalService;
  private readonly pullRequestClient?: PullRequestClient;
  private readonly pullRequestStatusClient?: PullRequestStatusClient;
  private readonly pullRequestChecksClient?: PullRequestChecksClient;
  private readonly pullRequestReviewsClient?: PullRequestReviewsClient;
  private readonly pullRequestMergeClient?: PullRequestMergeClient;
  private readonly deploymentClient?: DeploymentClient;
  private readonly deploymentStatusClient?: DeploymentStatusClient;
  private readonly scanner: RepositoryScanner;

  constructor(options: AgentRuntimeOptions) {
    this.repositoryRoot = options.repositoryRoot;
    this.provider = options.provider;
    this.instructions = options.instructions;
    this.maxToolCalls = options.maxToolCalls;
    this.testTimeoutMs = options.testTimeoutMs;
    this.approval = options.approval;
    this.pullRequestClient = options.pullRequestClient;
    this.pullRequestStatusClient = options.pullRequestStatusClient;
    this.pullRequestChecksClient = options.pullRequestChecksClient;
    this.pullRequestReviewsClient = options.pullRequestReviewsClient;
    this.pullRequestMergeClient = options.pullRequestMergeClient;
    this.deploymentClient = options.deploymentClient;
    this.deploymentStatusClient = options.deploymentStatusClient;
    this.scanner = new RepositoryScanner();
  }

  async run(task: Task, input: string): Promise<AgentRunResult> {
    const repository = await this.scanner.scan(this.repositoryRoot);
    const workspace = new RepositoryWorkspace({ root: this.repositoryRoot });
    const registry = new ToolRegistry();

    registry.register(createReadFileTool(workspace));
    registry.register(createWriteFileTool(workspace));
    registry.register(createRemoveFileTool(workspace));
    registry.register(createRunTestsTool(this.testTimeoutMs));
    registry.register(createGitStatusTool());
    registry.register(createGitDiffTool());
    registry.register(createGitBranchesTool());
    registry.register(createGitCreateBranchTool());
    registry.register(createGitStageTool());
    registry.register(createGitUnstageTool());
    registry.register(createGitCheckoutTool());
    registry.register(createGitCommitTool());
    registry.register(createGitPushTool());
    if (this.pullRequestClient) registry.register(createGitHubPullRequestTool(this.pullRequestClient));
    if (this.pullRequestStatusClient) registry.register(createGitHubPullRequestStatusTool(this.pullRequestStatusClient));
    if (this.pullRequestChecksClient) registry.register(createGitHubPullRequestChecksTool(this.pullRequestChecksClient));
    if (this.pullRequestReviewsClient) registry.register(createGitHubPullRequestReviewsTool(this.pullRequestReviewsClient));
    if (this.pullRequestStatusClient && this.pullRequestChecksClient && this.pullRequestReviewsClient && this.pullRequestMergeClient) {
      const gate = new StrictMergeGate({
        statusClient: this.pullRequestStatusClient,
        checksClient: this.pullRequestChecksClient,
        reviewsClient: this.pullRequestReviewsClient,
        mergeClient: this.pullRequestMergeClient,
      });
      registry.register(createGitHubMergePullRequestTool(gate));
    }
    if (this.deploymentClient) registry.register(createDeployTool(this.deploymentClient));
    if (this.deploymentStatusClient) registry.register(createDeploymentStatusTool(this.deploymentStatusClient));

    const model = new ProviderAgentModel({ provider: this.provider, task, repository, instructions: this.instructions });
    const agent = new AgentLoop(model, new ToolCaller(registry), { maxToolCalls: this.maxToolCalls });
    return agent.run(input, { workspaceRoot: this.repositoryRoot, approval: this.approval });
  }
}
