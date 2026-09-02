import type { ToolContext } from "../tools/tool.js";
import { ToolRegistry } from "../tools/registry.js";

export interface ToolCall {
  tool: string;
  input: unknown;
}

export interface ToolCallResult {
  tool: string;
  output?: unknown;
  error?: string;
}

export class ToolCaller {
  constructor(private readonly registry: ToolRegistry) {}

  async execute(call: ToolCall, context: ToolContext): Promise<ToolCallResult> {
    try {
      const tool = this.registry.get(call.tool);

      if (tool.requiresApproval) {
        if (!context.approval) {
          throw new Error(`Approval required for tool: ${call.tool}`);
        }

        const approved = await context.approval.requestApproval({
          tool: call.tool,
          input: call.input,
        });

        if (!approved) {
          throw new Error(`Tool execution not approved: ${call.tool}`);
        }
      }

      const output = await tool.execute(call.input, context);
      return { tool: call.tool, output };
    } catch (error) {
      return {
        tool: call.tool,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
