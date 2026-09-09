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
  maxConsecutiveToolErrors?: number;
  maxRepeatedToolCalls?: number;
}

function validatePositiveLimit(name: string, value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function toolCallIdentity(call: ToolCall): string {
  return `${call.tool}:${JSON.stringify(call.input)}`;
}

export class AgentLoop {
  private readonly maxToolCalls: number;
  private readonly maxConsecutiveToolErrors?: number;
  private readonly maxRepeatedToolCalls?: number;

  constructor(
    private readonly model: AgentModel,
    private readonly toolCaller: ToolCaller,
    options: AgentLoopOptions = {},
  ) {
    this.maxToolCalls = validatePositiveLimit("maxToolCalls", options.maxToolCalls) ?? 5;
    this.maxConsecutiveToolErrors = validatePositiveLimit(
      "maxConsecutiveToolErrors",
      options.maxConsecutiveToolErrors,
    );
    this.maxRepeatedToolCalls = validatePositiveLimit("maxRepeatedToolCalls", options.maxRepeatedToolCalls);
  }

  async run(input: string, context: ToolContext): Promise<AgentRunResult> {
    const toolResults: ToolCallResult[] = [];
    let consecutiveToolErrors = 0;
    let repeatedToolCalls = 0;
    let previousToolCallIdentity: string | undefined;

    for (let step = 0; step < this.maxToolCalls; step += 1) {
      const decision = await this.model.decide(input, toolResults);

      if (decision.type === "final") {
        return { content: decision.content ?? "", toolResults };
      }

      if (!decision.toolCall) {
        throw new Error("Agent returned a tool_call decision without a tool call");
      }

      const currentToolCallIdentity = toolCallIdentity(decision.toolCall);
      repeatedToolCalls = currentToolCallIdentity === previousToolCallIdentity ? repeatedToolCalls + 1 : 1;
      previousToolCallIdentity = currentToolCallIdentity;

      if (this.maxRepeatedToolCalls !== undefined && repeatedToolCalls > this.maxRepeatedToolCalls) {
        throw new Error(`Agent repeated the same tool call too many times: ${decision.toolCall.tool}`);
      }

      const result = await this.toolCaller.execute(decision.toolCall, context);
      toolResults.push(result);

      if (result.error) {
        consecutiveToolErrors += 1;
        if (this.maxConsecutiveToolErrors !== undefined && consecutiveToolErrors >= this.maxConsecutiveToolErrors) {
          throw new Error(`Agent exceeded maximum consecutive tool errors: ${this.maxConsecutiveToolErrors}`);
        }
      } else {
        consecutiveToolErrors = 0;
      }
    }

    throw new Error(`Agent exceeded maximum tool calls: ${this.maxToolCalls}`);
  }
}
