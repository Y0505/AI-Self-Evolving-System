import test from "node:test";
import assert from "node:assert/strict";
import {
  DeterministicGoalSelector,
  type EvaluatedOpportunity,
} from "./goal-selector.js";

const makeOpportunity = (
  id: string,
  score: number,
  title = `Opportunity ${id}`,
): EvaluatedOpportunity => ({
  opportunity: {
    id,
    title,
    problem: `Problem for ${id}`,
    source: "research",
    evidence: ["user evidence"],
    demandScore: score,
    feasibilityScore: score,
    impactScore: score,
    monetizationScore: score,
    strategicFitScore: score,
  },
  evaluation: {
    opportunityId: id,
    score,
    rank: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    rationale: "fixed evaluation",
  },
});

test("selector returns null when no opportunities are available", () => {
  const selector = new DeterministicGoalSelector();

  assert.equal(selector.select([]), null);
});

test("selector chooses the highest evaluated opportunity", () => {
  const selector = new DeterministicGoalSelector();

  assert.deepEqual(
    selector.select([
      makeOpportunity("opp-low", 40),
      makeOpportunity("opp-high", 90, "Automate support requests"),
      makeOpportunity("opp-medium", 65),
    ]),
    {
      opportunityId: "opp-high",
      title: "Automate support requests",
      problem: "Problem for opp-high",
      score: 90,
      rank: "high",
      rationale:
        "Goal selection chooses the highest evaluated opportunity using score-first ordering and a deterministic ID tie-breaker.",
    },
  );
});

test("selector uses the opportunity ID as a deterministic tie-breaker", () => {
  const selector = new DeterministicGoalSelector();

  const selected = selector.select([
    makeOpportunity("opp-z", 80),
    makeOpportunity("opp-a", 80),
  ]);

  assert.equal(selected?.opportunityId, "opp-a");
});
