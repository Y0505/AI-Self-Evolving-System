import test from "node:test";
import assert from "node:assert/strict";
import {
  DeterministicOpportunityEvaluator,
  type Opportunity,
} from "./opportunity-evaluator.js";

const opportunity: Opportunity = {
  id: "opp-1",
  title: "Automate a repetitive business workflow",
  problem: "Teams spend time manually processing recurring requests.",
  source: "research",
  evidence: ["repeated user requests", "manual processing cost"],
  demandScore: 90,
  feasibilityScore: 80,
  impactScore: 70,
  monetizationScore: 85,
  strategicFitScore: 60,
};

test("deterministic evaluator produces a weighted opportunity score", () => {
  const evaluator = new DeterministicOpportunityEvaluator();

  assert.deepEqual(evaluator.evaluate(opportunity), {
    opportunityId: "opp-1",
    score: 81,
    rank: "high",
    rationale:
      "Score combines demand, feasibility, impact, monetization potential, and strategic fit using fixed weights.",
  });
});

test("evaluator clamps scores outside the expected range", () => {
  const evaluator = new DeterministicOpportunityEvaluator();

  const evaluation = evaluator.evaluate({
    ...opportunity,
    demandScore: 150,
    feasibilityScore: -20,
  });

  assert.equal(evaluation.score, 69);
  assert.equal(evaluation.rank, "medium");
});
