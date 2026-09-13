import { readFile } from "node:fs/promises";
import type { DevelopmentPlan, DevelopmentTask, DevelopmentWorkspaceBoundary } from "./development-autonomy-runner.js";

/**
 * Deterministic roadmap observer. Parent checklist items with unchecked child
 * work are treated as containers; the actionable leaf item is selected instead.
 */
export class RoadmapWorkspace implements DevelopmentWorkspaceBoundary {
  constructor(private readonly roadmapPath: string) {}

  async inspect(): Promise<DevelopmentPlan> {
    const roadmap = await readFile(this.roadmapPath, "utf8");
    const lines = roadmap.split(/\r?\n/);
    const tasks: DevelopmentTask[] = [];
    let inNonGoals = false;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^##\s+Explicit non-goals/i.test(line)) {
        inNonGoals = true;
        continue;
      }
      if (/^##\s+/.test(line)) inNonGoals = false;
      if (inNonGoals) continue;

      const match = line.match(/^(\s*)- \[ \] (.+)$/);
      if (!match) continue;

      const title = match[2].trim();
      if (!title) continue;

      const indent = match[1].length;
      if (hasUncheckedChild(lines, index, indent)) continue;

      tasks.push({
        id: `roadmap-${index + 1}`,
        title,
        source: "roadmap",
      });
    }

    return { tasks };
  }
}

function hasUncheckedChild(lines: string[], parentIndex: number, parentIndent: number): boolean {
  for (let index = parentIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line)) return false;

    const match = line.match(/^(\s*)- \[[ xX]\] /);
    if (!match) continue;

    const indent = match[1].length;
    if (indent <= parentIndent) return false;
    if (/^(\s*)- \[ \] /.test(line)) return true;
  }

  return false;
}
