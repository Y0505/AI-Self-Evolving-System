import type { ToolContext } from "../tools/tool.js";
import { ToolRegistry } from "../tools/registry.js";
import type { DeterministicExecutionBudget } from "../runtime/execution-budget.js";

export interface ToolCall {
  tool: string;
  input: unknown;
}

export interface ToolCallResult {
  tool: string;
  output?: unknown;
  error?: string;
}

export interface ToolCallerOptions {
  budget?: DeterministicExecutionBudget;
}

export class ToolCaller {
  private readonly budget?: DeterministicExecutionBudget;

  constructor(
    private readonly registry: ToolRegistry,
    options: ToolCallerOptions = {},
  ) {
    this.budget = options.budget;
  }

  async execute(call: ToolCall, context: ToolContext): Promise<ToolCallResult> {
    // Budget exhaustion is a control-flow boundary and must propagate to the
    // autonomous run orchestrator rather than being converted into a tool error.
    this.budget?.consume("toolCalls");

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
