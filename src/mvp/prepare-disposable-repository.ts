import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const MARKER = ".ai-self-evolving-disposable";

async function runGit(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

async function main(): Promise<void> {
  const repositoryRoot = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(join(tmpdir(), "ai-self-evolving-mvp-")));

  await writeFile(join(repositoryRoot, MARKER), "Disposable repository for AI Self-Evolving System MVP validation.\n", "utf8");
  await writeFile(join(repositoryRoot, "README.md"), "# AI Self-Evolving System MVP disposable repository\n\nThis repository exists only for a bounded validation run.\n", "utf8");

  await runGit(repositoryRoot, ["init"]);
  await runGit(repositoryRoot, ["config", "user.name", "AI Self-Evolving System MVP"]);
  await runGit(repositoryRoot, ["config", "user.email", "mvp-validation@localhost"]);
  await runGit(repositoryRoot, ["add", "."]);
  await runGit(repositoryRoot, ["commit", "-m", "chore: initialize disposable MVP repository"]);

  console.log(`MVP_REPOSITORY_ROOT=${repositoryRoot}`);
  console.log("MVP_DISPOSABLE=1");
  console.log("Next: configure AI_API_ENDPOINT, AI_MODEL, and optional AI_API_KEY, then run npm run mvp:real.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
