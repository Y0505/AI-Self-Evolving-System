import type { RichLearningSummary } from "./richer-learning-analysis.js";
import type { ImprovementProposal } from "./improvement-proposal.js";

export interface RichImprovementProposer {
  propose(summary: RichLearningSummary): ImprovementProposal[];
}

export class DeterministicRichImprovementProposer implements RichImprovementProposer {
  propose(summary: RichLearningSummary): ImprovementProposal[] {
    if (summary.failures === 0 || summary.failurePatterns.length === 0) return [];

    return summary.failurePatterns.map((pattern) => ({
      id: `review-failure-pattern:${pattern.key}`,
      title: `Review recurring failure: ${pattern.key}`,
      rationale:
        `The same failure pattern occurred ${pattern.count} time(s) across ${pattern.taskIds.length} task(s). Review the evidence before considering an implementation change.`,
      evidence: {
        totalRecords: summary.total,
        failures: pattern.count,
        successRate: summary.successRate,
      },
      status: "proposed" as const,
    }));
  }
}
