import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const execFileAsync = promisify(execFile);
export const DISPOSABLE_MARKER = ".ai-self-evolving-disposable";

export interface MvpPreflightInput {
  repositoryRoot: string;
  endpoint: string;
  model: string;
}

export interface MvpPreflightResult {
  repositoryRoot: string;
  gitRoot: string;
  endpoint: string;
  model: string;
  apiKeyConfigured: boolean;
}

export function validateMvpPreflightInput(input: MvpPreflightInput): void {
  if (!input.repositoryRoot.trim()) {
    throw new Error("MVP_REPOSITORY_ROOT is required.");
  }
  if (!input.endpoint.trim()) {
    throw new Error("AI_API_ENDPOINT is required.");
  }
  if (!input.model.trim()) {
    throw new Error("AI_MODEL is required.");
  }

  let url: URL;
  try {
    url = new URL(input.endpoint);
  } catch {
    throw new Error("AI_API_ENDPOINT must be an absolute URL.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("AI_API_ENDPOINT must use HTTPS unless it targets localhost.");
  }
}

export async function runMvpPreflight(
  input: MvpPreflightInput & { apiKey?: string },
): Promise<MvpPreflightResult> {
  validateMvpPreflightInput(input);

  const repositoryRoot = resolve(input.repositoryRoot);
  const marker = join(repositoryRoot, DISPOSABLE_MARKER);
  try {
    await access(marker);
  } catch {
    throw new Error(`Disposable marker is missing at ${marker}`);
  }

  const { stdout: gitRootOutput } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
    cwd: repositoryRoot,
  });
  const gitRoot = resolve(gitRootOutput.trim());
  if (gitRoot !== repositoryRoot) {
    throw new Error(`MVP_REPOSITORY_ROOT must be the Git repository root; detected ${gitRoot}.`);
  }

  const { stdout: status } = await execFileAsync("git", ["status", "--porcelain"], {
    cwd: repositoryRoot,
  });
  if (status.trim()) {
    throw new Error("Disposable repository has uncommitted changes.");
  }

  return {
    repositoryRoot,
    gitRoot,
    endpoint: input.endpoint,
    model: input.model,
    apiKeyConfigured: Boolean(input.apiKey?.trim()),
  };
}
