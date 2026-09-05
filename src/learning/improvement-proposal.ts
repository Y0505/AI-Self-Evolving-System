import type { LearningSummary } from "./learning-analyzer.js";

export interface ImprovementProposal {
  id: string;
  title: string;
  rationale: string;
  evidence: {
    totalRecords: number;
    failures: number;
    successRate: number | null;
  };
  status: "proposed";
}

export interface ImprovementProposer {
  propose(summary: LearningSummary): ImprovementProposal[];
}

export class DeterministicImprovementProposer implements ImprovementProposer {
  propose(summary: LearningSummary): ImprovementProposal[] {
    if (summary.failures === 0) return [];

    return [
      {
        id: "review-failure-patterns",
        title: "Review recurring failure patterns",
        rationale:
          "Learning data contains failures; inspect their summaries before considering any implementation change.",
        evidence: {
          totalRecords: summary.total,
          failures: summary.failures,
          successRate: summary.successRate,
        },
        status: "proposed",
      },
    ];
  }
}
