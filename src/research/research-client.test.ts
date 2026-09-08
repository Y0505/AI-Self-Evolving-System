import test from "node:test";
import assert from "node:assert/strict";
import { DeterministicResearchClient, type ResearchRequest } from "./research-client.js";

const request: ResearchRequest = {
  goal: {
    opportunityId: "opp-1",
    title: "Automate support requests",
    problem: "Support requests require repetitive manual work.",
    score: 90,
    rank: "high",
    rationale: "Highest evaluated opportunity.",
  },
  questions: ["How frequent is the problem?", "What solutions already exist?"],
};

test("research client returns a deterministic boundary result without external research", async () => {
  const client = new DeterministicResearchClient();

  assert.deepEqual(await client.research(request), {
    goalId: "opp-1",
    summary: "External research is not configured for this boundary.",
    findings: [],
  });
});

test("research client preserves the selected goal identity", async () => {
  const client = new DeterministicResearchClient();
  const result = await client.research({
    ...request,
    goal: { ...request.goal, opportunityId: "opp-2" },
  });

  assert.equal(result.goalId, "opp-2");
});
