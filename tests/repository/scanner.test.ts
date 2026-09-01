import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { RepositoryScanner } from "../../src/repository/scanner.js";

test("scans repository structure and detects common project metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "self-evolving-"));

  await mkdir(join(root, "src"));
  await mkdir(join(root, "tests"));
  await mkdir(join(root, "node_modules"));
  await mkdir(join(root, ".git"));

  await writeFile(join(root, "src", "index.ts"), "export const value = 1;\n");
  await writeFile(join(root, "tests", "index.test.ts"), "test();\n");
  await writeFile(join(root, "package.json"), "{}\n");
  await writeFile(join(root, "tsconfig.json"), "{}\n");
  await writeFile(join(root, ".env"), "SECRET=hidden\n");
  await writeFile(join(root, "node_modules", "ignored.ts"), "ignored();\n");

  const snapshot = await new RepositoryScanner().scan(root);

  assert.equal(snapshot.files, 4);
  assert.equal(snapshot.directories, 2);
  assert.deepEqual(snapshot.languages, {
    TypeScript: 2,
    JSON: 2,
  });
  assert.equal(snapshot.testFiles, 1);
  assert.deepEqual(snapshot.configurationFiles, ["package.json", "tsconfig.json"]);
});

test("supports custom ignored directories and files", async () => {
  const root = await mkdtemp(join(tmpdir(), "self-evolving-"));
  await mkdir(join(root, "generated"));
  await writeFile(join(root, "keep.ts"), "export {};\n");
  await writeFile(join(root, "local.settings"), "ignored\n");
  await writeFile(join(root, "generated", "output.ts"), "ignored\n");

  const snapshot = await new RepositoryScanner({
    ignoredDirectories: ["generated"],
    ignoredFiles: ["local.settings"],
  }).scan(root);

  assert.equal(snapshot.files, 1);
  assert.equal(snapshot.directories, 0);
  assert.deepEqual(snapshot.languages, { TypeScript: 1 });
});
