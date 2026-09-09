import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicPlanningClient, type PlanningRequest } from "./planning-client.js";

const request: PlanningRequest = {
  goal: {
    opportunityId: "opp-1",
    title: "Automate support requests",
    problem: "Support requests require repetitive manual work.",
    score: 90,
    rank: "high",
    rationale: "Highest evaluated opportunity.",
  },
  research: {
    goalId: "opp-1",
    summary: "External research is not configured for this boundary.",
    findings: [],
  },
};

test("planning client returns a deterministic boundary result without execution", async () => {
  const client = new DeterministicPlanningClient();

  assert.deepEqual(await client.plan(request), {
    goalId: "opp-1",
    summary: "Execution planning is not configured for this boundary.",
    steps: [],
  });
});

test("planning client preserves the selected goal identity", async () => {
  const client = new DeterministicPlanningClient();
  const result = await client.plan({
    ...request,
    goal: { ...request.goal, opportunityId: "opp-2" },
  });

  assert.equal(result.goalId, "opp-2");
});
