import { spawn } from "node:child_process";
import type { Tool, ToolContext } from "./tool.js";

export type TestProfile = "test" | "build";

export interface RunTestsInput {
  profile: TestProfile;
}

export interface TestRunResult {
  profile: TestProfile;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_LENGTH = 20_000;

const commands: Record<TestProfile, { command: string; args: string[] }> = {
  test: { command: "npm", args: ["test"] },
  build: { command: "npm", args: ["run", "build"] },
};

export const createRunTestsTool = (
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Tool<RunTestsInput, TestRunResult> => ({
  name: "run_tests",
  description:
    "Run one of the repository's predefined validation profiles: test or build.",
  execute(input: RunTestsInput, context: ToolContext) {
    validateInput(input);
    return runProfile(input.profile, context.workspaceRoot, timeoutMs);
  },
});

function validateInput(input: RunTestsInput): void {
  if (!input || !(input.profile in commands)) {
    throw new Error("Unsupported test profile. Use \"test\" or \"build\".");
  }
}

function runProfile(
  profile: TestProfile,
  cwd: string,
  timeoutMs: number,
): Promise<TestRunResult> {
  const { command, args } = commands[profile];
  const executable = process.platform === "win32" ? "npm.cmd" : command;

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const appendOutput = (current: string, chunk: Buffer): string => {
      const next = current + chunk.toString("utf8");
      return next.length > MAX_OUTPUT_LENGTH
        ? next.slice(next.length - MAX_OUTPUT_LENGTH)
        : next;
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({
        profile,
        command: [command, ...args].join(" "),
        exitCode,
        stdout,
        stderr,
        timedOut,
      });
    });
  });
}
