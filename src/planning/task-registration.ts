import type { InMemoryTaskManager, ManagedTask } from "../core/task-manager.js";
import type { Task } from "../core/task.js";
import type { TaskDraft } from "./plan-task-bridge.js";

export interface TaskRegistrar {
  register(drafts: TaskDraft[]): ManagedTask[];
}

/**
 * Adapts generated task drafts to the existing task contract and registers them.
 * Registration does not execute any task.
 */
export class PlanTaskRegistrar implements TaskRegistrar {
  constructor(private readonly taskManager: InMemoryTaskManager) {}

  register(drafts: TaskDraft[]): ManagedTask[] {
    return drafts.map((draft) => {
      const task: Task = {
        id: draft.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
        provenance: {
          goalId: draft.goalId,
          planStepId: draft.planStepId,
        },
      };

      return this.taskManager.add(task);
    });
  }
}
