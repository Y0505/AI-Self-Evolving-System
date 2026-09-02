import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGitBranchesTool, createGitCreateBranchTool } from "../../src/tools/git-tools.js";
import { runGitCommand } from "../../src/git/git-command.js";

async function createRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-git-mutation-"));
  const init = await runGitCommand(["init"], { cwd: root });
  assert.equal(init.exitCode, 0);
  await runGitCommand(["config", "user.email", "test@example.com"], { cwd: root });
  await runGitCommand(["config", "user.name", "Test User"], { cwd: root });
  await writeFile(join(root, "example.txt"), "content\n", "utf8");
  assert.equal((await runGitCommand(["add", "example.txt"], { cwd: root })).exitCode, 0);
  assert.equal((await runGitCommand(["commit", "-m", "initial"], { cwd: root })).exitCode, 0);
  return root;
}

test("git_create_branch creates a local branch without checkout", async () => {
  const root = await createRepository();
  const result = await createGitCreateBranchTool().execute(
    { name: "agent/feature" },
    { workspaceRoot: root },
  );

  assert.equal(result.exitCode, 0);

  const branches = await createGitBranchesTool().execute({}, { workspaceRoot: root });
  assert.match(branches.stdout, /agent\/feature/);
  assert.match(branches.stdout, /\* (?:master|main)/);
});

test("git_create_branch rejects empty names", async () => {
  const root = await createRepository();
  await assert.rejects(
    () => createGitCreateBranchTool().execute({ name: "   " }, { workspaceRoot: root }),
    /branch name cannot be empty/,
  );
});

test("git_create_branch rejects option-like names", async () => {
  const root = await createRepository();
  await assert.rejects(
    () => createGitCreateBranchTool().execute({ name: "--delete" }, { workspaceRoot: root }),
    /cannot start with '-'/,
  );
});
