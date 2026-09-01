import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RepositoryWorkspace } from "../../src/repository/workspace.js";
import {
  createReadFileTool,
  createRemoveFileTool,
  createWriteFileTool,
} from "../../src/tools/file-tools.js";

const context = { workspaceRoot: "/workspace" };

test("file tools delegate to the controlled workspace", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-evolving-tools-"));
  const workspace = new RepositoryWorkspace({ root });
  const readFile = createReadFileTool(workspace);
  const writeFile = createWriteFileTool(workspace);
  const removeFile = createRemoveFileTool(workspace);

  await writeFile.execute({ path: "example.txt", content: "hello" }, context);
  assert.equal(await readFile.execute({ path: "example.txt" }, context), "hello");
  await removeFile.execute({ path: "example.txt" }, context);
  await assert.rejects(readFile.execute({ path: "example.txt" }, context));
});

test("file tools preserve workspace path restrictions", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-evolving-tools-"));
  const workspace = new RepositoryWorkspace({ root });
  const readFile = createReadFileTool(workspace);

  await assert.rejects(
    readFile.execute({ path: "../outside.txt" }, context),
    /escapes repository workspace/,
  );
});
