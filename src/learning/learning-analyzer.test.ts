import test from "node:test";
import assert from "node:assert/strict";
import type { LearningRecord } from "./learning-record.js";
import { DeterministicLearningAnalyzer } from "./learning-analyzer.js";

const record = (
  id: string,
  outcome: LearningRecord["outcome"],
  source: string,
): LearningRecord => ({
  id,
  taskId: "task-1",
  outcome,
  source,
  summary: `${source} ${outcome}`,
  createdAt: "2026-09-05T00:00:00.000Z",
});

test("analyzer summarizes outcomes deterministically", () => {
  const analyzer = new DeterministicLearningAnalyzer();

  assert.deepEqual(
    analyzer.analyze([
      record("1", "success", "test"),
      record("2", "failure", "test"),
      record("3", "unknown", "health"),
      record("4", "success", "health"),
    ]),
    {
      total: 4,
      successes: 2,
      failures: 1,
      unknown: 1,
      successRate: 0.5,
      outcomesBySource: {
        test: { success: 1, failure: 1, unknown: 0 },
        health: { success: 1, failure: 0, unknown: 1 },
      },
    },
  );
});

test("analyzer returns a null success rate for empty input", () => {
  const analyzer = new DeterministicLearningAnalyzer();

  assert.deepEqual(analyzer.analyze([]), {
    total: 0,
    successes: 0,
    failures: 0,
    unknown: 0,
    successRate: null,
    outcomesBySource: {},
  });
});
