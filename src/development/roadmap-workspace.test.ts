import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoadmapWorkspace } from "./roadmap-workspace.js";

describe("RoadmapWorkspace", () => {
  it("selects actionable leaf work while excluding explicit non-goals", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-roadmap-"));
    const path = join(root, "PROJECT_ROADMAP.md");
    await writeFile(path, [
      "## Current milestone",
      "- [ ] First real milestone",
      "  - [x] Completed detail",
      "  - [ ] Remaining detail",
      "## Explicit non-goals",
      "- [ ] No autonomous spending",
      "- [ ] No autonomous outreach",
      "## Next milestones",
      "- [ ] Future milestone",
    ].join("\n"));

    const plan = await new RoadmapWorkspace(path).inspect();
    assert.deepEqual(plan.tasks.map((task) => task.title), [
      "Remaining detail",
      "Future milestone",
    ]);
  });

  it("keeps a parent milestone when all of its children are already complete", async () => {
    const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-roadmap-"));
    const path = join(root, "PROJECT_ROADMAP.md");
    await writeFile(path, [
      "## Current milestone",
      "- [ ] Parent milestone",
      "  - [x] Completed detail",
    ].join("\n"));

    const plan = await new RoadmapWorkspace(path).inspect();
    assert.deepEqual(plan.tasks.map((task) => task.title), ["Parent milestone"]);
  });
});
