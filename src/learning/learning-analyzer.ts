import type { LearningOutcome, LearningRecord } from "./learning-record.js";

export interface LearningSummary {
  total: number;
  successes: number;
  failures: number;
  unknown: number;
  successRate: number | null;
  outcomesBySource: Record<string, Record<LearningOutcome, number>>;
}

export interface LearningAnalyzer {
  analyze(records: LearningRecord[]): LearningSummary;
}

export class DeterministicLearningAnalyzer implements LearningAnalyzer {
  analyze(records: LearningRecord[]): LearningSummary {
    const outcomesBySource: Record<string, Record<LearningOutcome, number>> = {};
    let successes = 0;
    let failures = 0;
    let unknown = 0;

    for (const record of records) {
      if (!outcomesBySource[record.source]) {
        outcomesBySource[record.source] = {
          success: 0,
          failure: 0,
          unknown: 0,
        };
      }

      outcomesBySource[record.source][record.outcome] += 1;

      if (record.outcome === "success") successes += 1;
      if (record.outcome === "failure") failures += 1;
      if (record.outcome === "unknown") unknown += 1;
    }

    return {
      total: records.length,
      successes,
      failures,
      unknown,
      successRate:
        records.length === 0 ? null : successes / records.length,
      outcomesBySource,
    };
  }
}
