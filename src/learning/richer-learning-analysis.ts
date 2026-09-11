import type { LearningRecord } from "./learning-record.js";
import type { LearningSummary } from "./learning-analyzer.js";

export interface FailurePattern {
  key: string;
  count: number;
  taskIds: string[];
}

export interface RichLearningSummary extends LearningSummary {
  outcomesByTask: Record<string, Record<LearningRecord["outcome"], number>>;
  failurePatterns: FailurePattern[];
}

export interface RichLearningAnalyzer {
  analyze(records: LearningRecord[]): RichLearningSummary;
}

const emptyOutcomeCounts = (): Record<LearningRecord["outcome"], number> => ({
  success: 0,
  failure: 0,
  unknown: 0,
});

const normalizeFailureSummary = (summary: string): string =>
  summary.trim().replace(/\s+/g, " ").toLowerCase();

export class DeterministicRichLearningAnalyzer implements RichLearningAnalyzer {
  analyze(records: LearningRecord[]): RichLearningSummary {
    const outcomesByTask: RichLearningSummary["outcomesByTask"] = {};
    const failureMap = new Map<string, { count: number; taskIds: Set<string> }>();

    let successes = 0;
    let failures = 0;
    let unknown = 0;
    const outcomesBySource: LearningSummary["outcomesBySource"] = {};

    for (const record of records) {
      if (!outcomesByTask[record.taskId]) {
        outcomesByTask[record.taskId] = emptyOutcomeCounts();
      }
      outcomesByTask[record.taskId][record.outcome] += 1;

      if (!outcomesBySource[record.source]) {
        outcomesBySource[record.source] = emptyOutcomeCounts();
      }
      outcomesBySource[record.source][record.outcome] += 1;

      if (record.outcome === "success") successes += 1;
      if (record.outcome === "failure") failures += 1;
      if (record.outcome === "unknown") unknown += 1;

      if (record.outcome === "failure") {
        const key = normalizeFailureSummary(record.summary);
        if (!key) continue;
        const existing = failureMap.get(key) ?? { count: 0, taskIds: new Set<string>() };
        existing.count += 1;
        existing.taskIds.add(record.taskId);
        failureMap.set(key, existing);
      }
    }

    const failurePatterns = [...failureMap.entries()]
      .map(([key, value]) => ({ key, count: value.count, taskIds: [...value.taskIds].sort() }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

    return {
      total: records.length,
      successes,
      failures,
      unknown,
      successRate: records.length === 0 ? null : successes / records.length,
      outcomesBySource,
      outcomesByTask,
      failurePatterns,
    };
  }
}
