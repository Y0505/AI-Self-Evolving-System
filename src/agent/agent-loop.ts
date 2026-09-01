import type { ToolContext } from "../tools/tool.js";
import { ToolCaller, type ToolCall, type ToolCallResult } from "./tool-caller.js";

export interface AgentDecision {
  type: "tool_call" | "final";
  toolCall?: ToolCall;
  content?: string;
}

export interface AgentModel {
  decide(input: string, history: ToolCallResult[]): Promise<AgentDecision>;
}

export interface AgentRunResult {
  content: string;
  toolResults: ToolCallResult[];
}

export interface AgentLoopOptions {
  maxToolCalls?: number;
}

export class AgentLoop {
  private readonly maxToolCalls: number;

  constructor(
    private readonly model: AgentModel,
    private readonly toolCaller: ToolCaller,
    options: AgentLoopOptions = {},
  ) {
    this.maxToolCalls = options.maxToolCalls ?? 5;
  }

  async run(input: string, context: ToolContext): Promise<AgentRunResult> {
    const toolResults: ToolCallResult[] = [];

    for (let step = 0; step < this.maxToolCalls; step += 1) {
      const decision = await this.model.decide(input, toolResults);

      if (decision.type === "final") {
        return { content: decision.content ?? "", toolResults };
      }

      if (!decision.toolCall) {
        throw new Error("Agent returned a tool_call decision without a tool call");
      }

      const result = await this.toolCaller.execute(decision.toolCall, context);
      toolResults.push(result);
    }

    throw new Error(`Agent exceeded maximum tool calls: ${this.maxToolCalls}`);
  }
}
