import { describe, expect, it } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RoadmapWorkspace } from "./roadmap-workspace.js";

describe("RoadmapWorkspace", () => {
  it("selects unchecked work while excluding explicit non-goals", async () => {
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
    expect(plan.tasks.map((task) => task.title)).toEqual([
      "First real milestone",
      "Remaining detail",
      "Future milestone",
    ]);
  });
});
