import { isAbsolute, normalize } from "node:path";
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

export interface GitStageInput {
  paths: string[];
}

export interface GitCommitInput {
  message: string;
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

export const createGitStageTool = (
  options?: GitCommandToolOptions,
): Tool<GitStageInput, GitMutationResult> => ({
  name: "git_stage",
  description:
    "Stage explicitly named repository paths for the next commit. This changes only the Git index and is reversible with unstaging.",
  async execute(input: GitStageInput, context: ToolContext) {
    if (!Array.isArray(input.paths) || input.paths.length === 0) {
      throw new Error("Git stage paths cannot be empty");
    }

    const paths = input.paths.map((path) => {
      if (typeof path !== "string" || !path.trim()) {
        throw new Error("Git stage paths must be non-empty strings");
      }
      const trimmed = path.trim();
      if (isAbsolute(trimmed)) {
        throw new Error("Git stage paths must be relative");
      }
      const normalized = normalize(trimmed);
      if (normalized === ".." || normalized.startsWith(`..${"/"}`) || normalized.startsWith(`..\\`)) {
        throw new Error("Git stage path cannot escape the repository");
      }
      if (trimmed.startsWith("-")) {
        throw new Error("Git stage path cannot start with '-'");
      }
      return trimmed;
    });

    const args = ["add", "--", ...paths];
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

export const createGitCommitTool = (
  options?: GitCommandToolOptions,
): Tool<GitCommitInput, GitMutationResult> => ({
  name: "git_commit",
  description:
    "Create a Git commit from the currently staged changes. This is a durable repository mutation and requires explicit approval.",
  requiresApproval: true,
  async execute(input: GitCommitInput, context: ToolContext) {
    if (!input || typeof input.message !== "string" || !input.message.trim()) {
      throw new Error("Git commit message cannot be empty");
    }

    const message = input.message.trim();
    const args = ["commit", "-m", message];
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
