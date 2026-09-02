import type { Tool, ToolContext } from "./tool.js";
import { runGitCommand } from "../git/git-command.js";

export interface GitCommandToolOptions {
  timeoutMs?: number;
  maxOutputLength?: number;
}

export interface GitReadResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface GitBranchInput {
  name: string;
}

export interface GitMutationResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

const GIT_OPTIONS: GitCommandToolOptions = {};

function createGitReadTool(
  name: string,
  description: string,
  args: string[],
  options: GitCommandToolOptions = GIT_OPTIONS,
): Tool<Record<string, never>, GitReadResult> {
  return {
    name,
    description,
    async execute(_input: Record<string, never>, context: ToolContext) {
      const result = await runGitCommand(args, {
        cwd: context.workspaceRoot,
        timeoutMs: options.timeoutMs,
        maxOutputLength: options.maxOutputLength,
      });
      return {
        command: ["git", ...args].join(" "),
        ...result,
      };
    },
  };
}

export const createGitStatusTool = (
  options?: GitCommandToolOptions,
): Tool<Record<string, never>, GitReadResult> =>
  createGitReadTool(
    "git_status",
    "Show the repository working tree status. This is a read-only operation.",
    ["status", "--short", "--branch"],
    options,
  );

export const createGitDiffTool = (
  options?: GitCommandToolOptions,
): Tool<Record<string, never>, GitReadResult> =>
  createGitReadTool(
    "git_diff",
    "Show unstaged repository changes. This is a read-only operation.",
    ["diff", "--no-ext-diff", "--no-color"],
    options,
  );

export const createGitBranchesTool = (
  options?: GitCommandToolOptions,
): Tool<Record<string, never>, GitReadResult> =>
  createGitReadTool(
    "git_branches",
    "List local repository branches. This is a read-only operation.",
    ["branch", "--list", "--no-color"],
    options,
  );

export const createGitCreateBranchTool = (
  options?: GitCommandToolOptions,
): Tool<GitBranchInput, GitMutationResult> => ({
  name: "git_create_branch",
  description:
    "Create a new local Git branch without checking it out. This changes repository state but does not modify tracked files.",
  async execute(input: GitBranchInput, context: ToolContext) {
    if (!input.name.trim()) {
      throw new Error("Git branch name cannot be empty");
    }
    if (input.name.startsWith("-")) {
      throw new Error("Git branch name cannot start with '-'");
    }

    const name = input.name.trim();
    const args = ["branch", "--", name];
    const result = await runGitCommand(args, {
      cwd: context.workspaceRoot,
      timeoutMs: options?.timeoutMs,
      maxOutputLength: options?.maxOutputLength,
    });

    return {
      command: ["git", ...args].join(" "),
      ...result,
    };
  },
});
