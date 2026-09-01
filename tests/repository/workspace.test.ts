import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RepositoryWorkspace } from "../../src/repository/workspace.js";

test("reads, writes, and removes files inside the workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-evolving-workspace-"));
  const workspace = new RepositoryWorkspace({ root });

  await workspace.write("src/example.ts", "export const value = 42;\n");
  assert.equal(await workspace.read("src/example.ts"), "export const value = 42;\n");

  await workspace.remove("src/example.ts");
  await assert.rejects(access(join(root, "src/example.ts")));
});

test("creates parent directories automatically", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-evolving-workspace-"));
  const workspace = new RepositoryWorkspace({ root });

  await workspace.write("deep/nested/file.txt", "hello");
  assert.equal(await readFile(join(root, "deep/nested/file.txt"), "utf8"), "hello");
});

test("rejects absolute and path-traversal targets", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-evolving-workspace-"));
  const workspace = new RepositoryWorkspace({ root });

  await assert.rejects(workspace.read(join(root, "outside.txt")), /relative/);
  await assert.rejects(workspace.read("../outside.txt"), /escapes repository workspace/);
  await assert.rejects(workspace.write("../../outside.txt", "unsafe"), /escapes repository workspace/);
});
