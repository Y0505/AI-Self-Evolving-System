import { readFile } from "node:fs/promises";
import type { DevelopmentPlan, DevelopmentTask, DevelopmentWorkspaceBoundary } from "./development-autonomy-runner.js";

/**
 * Deterministic roadmap observer. It intentionally reads only the roadmap and
 * never decides that an unchecked item is safe to implement beyond its title.
 */
export class RoadmapWorkspace implements DevelopmentWorkspaceBoundary {
  constructor(private readonly roadmapPath: string) {}

  async inspect(): Promise<DevelopmentPlan> {
    const roadmap = await readFile(this.roadmapPath, "utf8");
    const tasks: DevelopmentTask[] = [];
    let inNonGoals = false;

    for (const line of roadmap.split(/\r?\n/)) {
      if (/^##\s+Explicit non-goals/i.test(line)) {
        inNonGoals = true;
        continue;
      }
      if (/^##\s+/.test(line)) inNonGoals = false;
      if (inNonGoals) continue;

      const match = line.match(/^\s*- \[ \] (.+)$/);
      if (!match) continue;

      const title = match[1].trim();
      if (!title) continue;

      tasks.push({
        id: `roadmap-${tasks.length + 1}`,
        title,
        source: "roadmap",
      });
    }

    return { tasks };
  }
}
