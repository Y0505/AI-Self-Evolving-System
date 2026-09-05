import test from "node:test";
import assert from "node:assert/strict";
import type { LearningSummary } from "./learning-analyzer.js";
import { DeterministicImprovementProposer } from "./improvement-proposal.js";

const summary = (failures: number): LearningSummary => ({
  total: 4, successes: 4 - failures, failures, unknown: 0,
  successRate: failures === 4 ? 0 : (4 - failures) / 4,
  outcomesBySource: {},
});

test("proposer emits a deterministic review proposal when failures exist", () => {
  const proposer = new DeterministicImprovementProposer();
  assert.deepEqual(proposer.propose(summary(2)), [{
    id: "review-failure-patterns",
    title: "Review recurring failure patterns",
    rationale: "Learning data contains failures; inspect their summaries before considering any implementation change.",
    evidence: { totalRecords: 4, failures: 2, successRate: 0.5 },
    status: "proposed",
  }]);
});

test("proposer emits no improvement proposal when there are no failures", () => {
  const proposer = new DeterministicImprovementProposer();
  assert.deepEqual(proposer.propose(summary(0)), []);
});
