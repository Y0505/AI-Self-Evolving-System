import type { ToolApprovalService } from "./approval.js";

export interface ToolContext {
  workspaceRoot: string;
  approval?: ToolApprovalService;
}

export interface Tool<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  readonly requiresApproval?: boolean;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
