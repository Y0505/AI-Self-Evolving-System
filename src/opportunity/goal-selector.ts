import type { Opportunity, OpportunityEvaluation } from "./opportunity-evaluator.js";

export interface EvaluatedOpportunity {
  opportunity: Opportunity;
  evaluation: OpportunityEvaluation;
}

export interface SelectedGoal {
  opportunityId: string;
  title: string;
  problem: string;
  score: number;
  rank: OpportunityEvaluation["rank"];
  rationale: string;
}

export interface GoalSelector {
  select(opportunities: EvaluatedOpportunity[]): SelectedGoal | null;
}

export class DeterministicGoalSelector implements GoalSelector {
  select(opportunities: EvaluatedOpportunity[]): SelectedGoal | null {
    if (opportunities.length === 0) return null;

    const selected = [...opportunities].sort((left, right) => {
      if (right.evaluation.score !== left.evaluation.score) {
        return right.evaluation.score - left.evaluation.score;
      }

      return left.opportunity.id.localeCompare(right.opportunity.id);
    })[0];

    return {
      opportunityId: selected.opportunity.id,
      title: selected.opportunity.title,
      problem: selected.opportunity.problem,
      score: selected.evaluation.score,
      rank: selected.evaluation.rank,
      rationale:
        "Goal selection chooses the highest evaluated opportunity using score-first ordering and a deterministic ID tie-breaker.",
    };
  }
}
