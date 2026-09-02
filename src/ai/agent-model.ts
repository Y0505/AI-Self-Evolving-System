import type { AgentDecision, AgentModel } from "../agent/agent-loop.js";
import type { ToolCallResult } from "../agent/tool-caller.js";
import type { Task } from "../core/task.js";
import type { RepositorySnapshot } from "../repository/scanner.js";
import type { AIProvider } from "./provider.js";

export interface ProviderAgentModelOptions {
  provider: AIProvider;
  task: Task;
  repository: RepositorySnapshot;
  instructions?: string;
}

export class ProviderAgentModel implements AgentModel {
  private readonly provider: AIProvider;
  private readonly task: Task;
  private readonly repository: RepositorySnapshot;
  private readonly instructions?: string;

  constructor(options: ProviderAgentModelOptions) {
    this.provider = options.provider;
    this.task = options.task;
    this.repository = options.repository;
    this.instructions = options.instructions;
  }

  async decide(input: string, history: ToolCallResult[]): Promise<AgentDecision> {
    const response = await this.provider.generate({
      task: this.task,
      repository: this.repository,
      instructions: buildInstructions(this.instructions, input, history),
    });

    return parseAgentDecision(response.content);
  }
}

function buildInstructions(
  instructions: string | undefined,
  input: string,
  history: ToolCallResult[],
): string {
  const historyText = JSON.stringify(history);
  return [
    instructions,
    `Current agent input: ${input}`,
    "Available tools: read_file, write_file, remove_file, run_tests, git_status, git_diff, git_branches, git_create_branch, git_stage, git_unstage, git_checkout, git_commit.",
    'The run_tests tool accepts {"profile":"test"} or {"profile":"build"}.',
    "The git_status, git_diff, and git_branches tools take an empty object and are read-only.",
    'The git_create_branch tool accepts {"name":"branch/name"}; it creates a local branch without checking it out and does not modify tracked files.',
    'The git_stage tool accepts {"paths":["path/to/file"]}; it stages only explicitly named relative paths and does not require approval.',
    'The git_unstage tool accepts {"paths":["path/to/file"]}; it removes only explicitly named relative paths from the Git index, keeps working tree changes, and does not require approval.',
    'The git_checkout tool accepts {"name":"branch/name"}; it switches to an existing local branch and always requires explicit approval because it can change tracked files in the working tree.',
    'The git_commit tool accepts {"message":"commit message"}; it creates a durable Git commit and always requires explicit approval before execution.',
    "Git mutation tools must remain narrowly scoped; do not assume arbitrary Git commands are available.",
    "Higher-impact Git mutations such as reset, clean, and push are not available.",
    "Respond with JSON only.",
    "Choose exactly one action: a tool_call or a final response.",
    'Tool call format: {"type":"tool_call","toolCall":{"tool":"tool_name","input":{}}}',
    'Final format: {"type":"final","content":"response text"}',
    `Tool result history: ${historyText}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseAgentDecision(content: string): AgentDecision {
  const json = extractJson(content);

  if (!json || typeof json !== "object") {
    throw new Error("AI provider returned an invalid agent decision");
  }

  const value = json as Record<string, unknown>;

  if (value.type === "final" && typeof value.content === "string") {
    return { type: "final", content: value.content };
  }

  if (value.type === "tool_call" && isToolCall(value.toolCall)) {
    return {
      type: "tool_call",
      toolCall: {
        tool: value.toolCall.tool,
        input: value.toolCall.input,
      },
    };
  }

  throw new Error("AI provider returned an invalid agent decision");
}

function isToolCall(value: unknown): value is { tool: string; input: unknown } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const call = value as Record<string, unknown>;
  return typeof call.tool === "string" && "input" in call;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    return JSON.parse(unfenced);
  } catch {
    return undefined;
  }
}
