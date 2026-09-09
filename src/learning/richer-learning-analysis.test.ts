import test from "node:test";
import assert from "node:assert/strict";
import type { LearningRecord } from "./learning-record.js";
import { DeterministicRichLearningAnalyzer } from "./richer-learning-analysis.js";

const record = (
  id: string,
  taskId: string,
  outcome: LearningRecord["outcome"],
  source: string,
  summary: string,
): LearningRecord => ({ id, taskId, outcome, source, summary, createdAt: "2026-09-09T00:00:00.000Z" });

test("rich analyzer summarizes outcomes by task and failure pattern", () => {
  const analyzer = new DeterministicRichLearningAnalyzer();
  assert.deepEqual(analyzer.analyze([
    record("1", "task-a", "failure", "mvp-runner", "Test failed: timeout"),
    record("2", "task-b", "failure", "mvp-runner", " test   failed: TIMEOUT "),
    record("3", "task-a", "success", "mvp-runner", "completed"),
    record("4", "task-c", "unknown", "health", "not observed"),
  ]), {
    total: 4,
    successes: 1,
    failures: 2,
    unknown: 1,
    successRate: 0.25,
    outcomesBySource: {
      "mvp-runner": { success: 1, failure: 2, unknown: 0 },
      health: { success: 0, failure: 0, unknown: 1 },
    },
    outcomesByTask: {
      "task-a": { success: 1, failure: 1, unknown: 0 },
      "task-b": { success: 0, failure: 1, unknown: 0 },
      "task-c": { success: 0, failure: 0, unknown: 1 },
    },
    failurePatterns: [
      { key: "test failed: timeout", count: 2, taskIds: ["task-a", "task-b"] },
    ],
  });
});

test("rich analyzer ignores empty failure summaries and handles empty input", () => {
  const analyzer = new DeterministicRichLearningAnalyzer();
  assert.deepEqual(analyzer.analyze([
    record("1", "task-a", "failure", "mvp-runner", "   "),
  ]).failurePatterns, []);
  assert.deepEqual(analyzer.analyze([]), {
    total: 0,
    successes: 0,
    failures: 0,
    unknown: 0,
    successRate: null,
    outcomesBySource: {},
    outcomesByTask: {},
    failurePatterns: [],
  });
});
