import type { PlanningResult } from "./planning-client.js";

export interface TaskDraft {
  id: string;
  goalId: string;
  planStepId: string;
  title: string;
  description: string;
}

export interface PlanTaskBridge {
  createTasks(plan: PlanningResult): TaskDraft[];
}

/**
 * Deterministically converts plan steps into task drafts.
 * It deliberately does not add tasks to the runtime task manager or execute them.
 */
export class DeterministicPlanTaskBridge implements PlanTaskBridge {
  createTasks(plan: PlanningResult): TaskDraft[] {
    return plan.steps.map((step) => ({
      id: `${plan.goalId}:${step.id}`,
      goalId: plan.goalId,
      planStepId: step.id,
      title: step.title.trim(),
      description: step.description.trim(),
    }));
  }
}
