import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGitBranchesTool, createGitDiffTool, createGitStatusTool } from "../../src/tools/git-tools.js";
import { runGitCommand } from "../../src/git/git-command.js";

async function createRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-git-"));
  const init = await runGitCommand(["init"], { cwd: root });
  assert.equal(init.exitCode, 0);
  return root;
}

test("git_status reports repository state", async () => {
  const root = await createRepository();
  const tool = createGitStatusTool();

  const result = await tool.execute({}, { workspaceRoot: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /## (No commits yet on )?master|## (No commits yet on )?main/);
});

test("git_diff exposes working tree changes", async () => {
  const root = await createRepository();
  await runGitCommand(["config", "user.email", "test@example.com"], { cwd: root });
  await runGitCommand(["config", "user.name", "Test User"], { cwd: root });
  await writeFile(join(root, "example.txt"), "before\n", "utf8");
  assert.equal((await runGitCommand(["add", "example.txt"], { cwd: root })).exitCode, 0);
  assert.equal((await runGitCommand(["commit", "-m", "initial"], { cwd: root })).exitCode, 0);
  await writeFile(join(root, "example.txt"), "after\n", "utf8");

  const result = await createGitDiffTool().execute({}, { workspaceRoot: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /-before/);
  assert.match(result.stdout, /\+after/);
});

test("git_branches lists local branches after a commit", async () => {
  const root = await createRepository();
  await runGitCommand(["config", "user.email", "test@example.com"], { cwd: root });
  await runGitCommand(["config", "user.name", "Test User"], { cwd: root });
  await writeFile(join(root, "example.txt"), "content\n", "utf8");
  assert.equal((await runGitCommand(["add", "example.txt"], { cwd: root })).exitCode, 0);
  assert.equal((await runGitCommand(["commit", "-m", "initial"], { cwd: root })).exitCode, 0);

  const result = await createGitBranchesTool().execute({}, { workspaceRoot: root });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /\*/);
});

test("git tools use the supplied workspace", async () => {
  const first = await createRepository();
  const second = await createRepository();
  await writeFile(join(first, "first.txt"), "first\n", "utf8");
  await writeFile(join(second, "second.txt"), "second\n", "utf8");

  const result = await createGitStatusTool().execute({}, { workspaceRoot: second });

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /second\.txt/);
  assert.doesNotMatch(result.stdout, /first\.txt/);
});

test("git command output is bounded", async () => {
  const root = await createRepository();
  const result = await runGitCommand(["status", "--short", "--branch"], {
    cwd: root,
    maxOutputLength: 100,
  });

  assert.equal(result.exitCode, 0);
  assert.ok(result.stdout.length <= 100);
});
