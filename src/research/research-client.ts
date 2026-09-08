import type { SelectedGoal } from "../opportunity/goal-selector.js";

export interface ResearchRequest {
  goal: SelectedGoal;
  questions: string[];
}

export interface ResearchFinding {
  source: string;
  summary: string;
}

export interface ResearchResult {
  goalId: string;
  summary: string;
  findings: ResearchFinding[];
}

export interface ResearchClient {
  research(request: ResearchRequest): Promise<ResearchResult>;
}

/**
 * Deterministic placeholder for the research boundary.
 * It deliberately performs no external research.
 */
export class DeterministicResearchClient implements ResearchClient {
  async research(request: ResearchRequest): Promise<ResearchResult> {
    return {
      goalId: request.goal.opportunityId,
      summary: "External research is not configured for this boundary.",
      findings: [],
    };
  }
}
