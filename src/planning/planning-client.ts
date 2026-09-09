import type { SelectedGoal } from "../opportunity/goal-selector.js";
import type { ResearchResult } from "../research/research-client.js";

export interface PlanningRequest {
  goal: SelectedGoal;
  research: ResearchResult;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
}

export interface PlanningResult {
  goalId: string;
  summary: string;
  steps: PlanStep[];
}

export interface PlanningClient {
  plan(request: PlanningRequest): Promise<PlanningResult>;
}

/**
 * Deterministic placeholder for the planning boundary.
 * It deliberately creates no executable work.
 */
export class DeterministicPlanningClient implements PlanningClient {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    return {
      goalId: request.goal.opportunityId,
      summary: "Execution planning is not configured for this boundary.",
      steps: [],
    };
  }
}
