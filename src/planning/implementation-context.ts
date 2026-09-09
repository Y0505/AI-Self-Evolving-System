import type { Task } from "../core/task.js";
import type { PlanningResult } from "./planning-client.js";
import type { ResearchResult } from "../research/research-client.js";
import type { SelectedGoal } from "../opportunity/goal-selector.js";

export interface ImplementationContext {
  goal: SelectedGoal;
  research: ResearchResult;
  plan: PlanningResult;
  task: Task;
}

export interface ImplementationContextBuilder {
  build(input: ImplementationContext): ImplementationContext;
}

export class DeterministicImplementationContextBuilder implements ImplementationContextBuilder {
  build(input: ImplementationContext): ImplementationContext {
    if (input.goal.opportunityId !== input.research.goalId) {
      throw new Error("Implementation context goal does not match research");
    }
    if (input.goal.opportunityId !== input.plan.goalId) {
      throw new Error("Implementation context goal does not match plan");
    }
    if (input.task.provenance && input.task.provenance.goalId !== input.goal.opportunityId) {
      throw new Error("Implementation context goal does not match task provenance");
    }

    return {
      goal: input.goal,
      research: input.research,
      plan: input.plan,
      task: input.task,
    };
  }
}
