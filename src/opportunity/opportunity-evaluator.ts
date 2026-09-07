export interface Opportunity {
  id: string;
  title: string;
  problem: string;
  source: string;
  evidence: string[];
  demandScore: number;
  feasibilityScore: number;
  impactScore: number;
  monetizationScore: number;
  strategicFitScore: number;
}

export interface OpportunityEvaluation {
  opportunityId: string;
  score: number;
  rank: "low" | "medium" | "high";
  rationale: string;
}

export interface OpportunityEvaluator {
  evaluate(opportunity: Opportunity): OpportunityEvaluation;
}

const clampScore = (value: number): number => Math.min(100, Math.max(0, value));

export class DeterministicOpportunityEvaluator implements OpportunityEvaluator {
  evaluate(opportunity: Opportunity): OpportunityEvaluation {
    const score = Math.round(
      clampScore(opportunity.demandScore) * 0.3 +
        clampScore(opportunity.feasibilityScore) * 0.2 +
        clampScore(opportunity.impactScore) * 0.2 +
        clampScore(opportunity.monetizationScore) * 0.2 +
        clampScore(opportunity.strategicFitScore) * 0.1,
    );

    const rank = score >= 75 ? "high" : score >= 50 ? "medium" : "low";

    return {
      opportunityId: opportunity.id,
      score,
      rank,
      rationale:
        "Score combines demand, feasibility, impact, monetization potential, and strategic fit using fixed weights.",
    };
  }
}
