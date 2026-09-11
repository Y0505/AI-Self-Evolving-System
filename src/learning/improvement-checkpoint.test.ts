import test from "node:test";
import assert from "node:assert/strict";
import type { ImprovementProposal } from "./improvement-proposal.js";
import { ImprovementCheckpoint, type ImprovementApprovalRequest } from "./improvement-checkpoint.js";

const proposal: ImprovementProposal = {
  id: "review-failure-pattern:timeout",
  title: "Review recurring failure: timeout",
  rationale: "Review the evidence before considering an implementation change.",
  evidence: { totalRecords: 3, failures: 2, successRate: 1 / 3 },
  status: "proposed",
};

test("checkpoint returns approved only when the approval service approves", async () => {
  const requests: ImprovementApprovalRequest[] = [];
  const checkpoint = new ImprovementCheckpoint({
    requestApproval: async (request) => {
      requests.push(request);
      return true;
    },
  });

  assert.deepEqual(await checkpoint.check(proposal), {
    proposalId: proposal.id,
    status: "approved",
  });
  assert.deepEqual(requests, [{ proposal }]);
});

test("checkpoint preserves rejection", async () => {
  const checkpoint = new ImprovementCheckpoint({
    requestApproval: async () => false,
  });

  assert.deepEqual(await checkpoint.check(proposal), {
    proposalId: proposal.id,
    status: "rejected",
  });
});
