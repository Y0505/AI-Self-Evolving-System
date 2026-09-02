import type { AIProvider } from "../ai/provider.js";
import { ProviderAgentModel } from "../ai/agent-model.js";
import { AgentLoop, type AgentRunResult } from "../agent/agent-loop.js";
import { ToolCaller } from "../agent/tool-caller.js";
import type { Task } from "../core/task.js";
import { RepositoryScanner } from "../repository/scanner.js";
import { RepositoryWorkspace } from "../repository/workspace.js";
import { ToolRegistry } from "../tools/registry.js";
import type { ToolApprovalService } from "../tools/approval.js";
import {
  createReadFileTool,
  createRemoveFileTool,
  createWriteFileTool,
} from "../tools/file-tools.js";
import { createRunTestsTool } from "../tools/test-runner.js";
import {
  createGitBranchesTool,
  createGitCheckoutTool,
  createGitCommitTool,
  createGitCreateBranchTool,
  createGitDiffTool,
  createGitPushTool,
  createGitStageTool,
  createGitStatusTool,
  createGitUnstageTool,
} from "../tools/git-tools.js";

export interface AgentRuntimeOptions {
  repositoryRoot: string;
  provider: AIProvider;
  instructions?: string;
  maxToolCalls?: number;
  testTimeoutMs?: number;
  approval?: ToolApprovalService;
}

export class AgentRuntime {
  private readonly repositoryRoot: string;
  private readonly provider: AIProvider;
  private readonly instructions?: string;
  private readonly maxToolCalls?: number;
  private readonly testTimeoutMs?: number;
  private readonly approval?: ToolApprovalService;
  private readonly scanner: RepositoryScanner;

  constructor(options: AgentRuntimeOptions) {
    this.repositoryRoot = options.repositoryRoot;
    this.provider = options.provider;
    this.instructions = options.instructions;
    this.maxToolCalls = options.maxToolCalls;
    this.testTimeoutMs = options.testTimeoutMs;
    this.approval = options.approval;
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

    const model = new ProviderAgentModel({
      provider: this.provider,
      task,
      repository,
      instructions: this.instructions,
    });
    const agent = new AgentLoop(model, new ToolCaller(registry), {
      maxToolCalls: this.maxToolCalls,
    });

    return agent.run(input, {
      workspaceRoot: this.repositoryRoot,
      approval: this.approval,
    });
  }
}
