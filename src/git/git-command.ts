import { execFile } from "node:child_process";

export interface GitCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface GitCommandOptions {
  cwd: string;
  timeoutMs?: number;
  maxOutputLength?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_LENGTH = 20_000;

export function runGitCommand(
  args: string[],
  options: GitCommandOptions,
): Promise<GitCommandResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputLength = options.maxOutputLength ?? DEFAULT_MAX_OUTPUT_LENGTH;

  if (timeoutMs <= 0) {
    throw new Error("Git command timeout must be greater than zero");
  }
  if (maxOutputLength <= 0) {
    throw new Error("Git command output limit must be greater than zero");
  }

  return new Promise((resolve, reject) => {
    execFile("git", args, {
      cwd: options.cwd,
      shell: false,
      timeout: timeoutMs,
      maxBuffer: maxOutputLength,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ exitCode: 0, stdout, stderr });
        return;
      }

      const exitCode = typeof error.code === "number" ? error.code : 1;
      resolve({ exitCode, stdout, stderr });
    });
  });
}
