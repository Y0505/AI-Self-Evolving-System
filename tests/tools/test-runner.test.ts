import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRunTestsTool } from "../../src/tools/test-runner.js";

async function createPackage(scripts: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-test-runner-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ private: true, scripts }, null, 2),
    "utf8",
  );
  return root;
}

test("run_tests executes the predefined test profile", async () => {
  const root = await createPackage({ test: "node -e \"console.log('tests ok')\"" });
  const tool = createRunTestsTool();

  const result = await tool.execute({ profile: "test" }, { workspaceRoot: root });

  assert.equal(result.profile, "test");
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.match(result.stdout, /tests ok/);
});

test("run_tests executes the predefined build profile", async () => {
  const root = await createPackage({ build: "node -e \"console.log('build ok')\"" });
  const tool = createRunTestsTool();

  const result = await tool.execute({ profile: "build" }, { workspaceRoot: root });

  assert.equal(result.profile, "build");
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.match(result.stdout, /build ok/);
});

test("run_tests reports validation failures without throwing", async () => {
  const root = await createPackage({
    test: "node -e \"console.error('tests failed'); process.exit(2)\"",
  });
  const tool = createRunTestsTool();

  const result = await tool.execute({ profile: "test" }, { workspaceRoot: root });

  assert.equal(result.exitCode, 2);
  assert.equal(result.timedOut, false);
  assert.match(result.stderr, /tests failed/);
});

test("run_tests rejects arbitrary profiles", () => {
  const root = "unused";
  const tool = createRunTestsTool();

  assert.throws(
    () => tool.execute({ profile: "npm install" as never }, { workspaceRoot: root }),
    /Unsupported test profile/,
  );
});
