import test from "node:test";
import assert from "node:assert/strict";
import type { ImprovementProposal } from "./improvement-proposal.js";
import { ApprovedImprovementExecutor } from "./improvement-execution.js";

const proposal: ImprovementProposal = {
  id: "review-failure-patterns",
  title: "Review recurring failure patterns",
  rationale: "Inspect failure summaries before considering an implementation change.",
  evidence: {
    totalRecords: 4,
    failures: 2,
    successRate: 0.5,
  },
  status: "proposed",
};

test("executor rejects improvement execution without explicit approval", async () => {
  const executor = new ApprovedImprovementExecutor();

  assert.deepEqual(await executor.execute(proposal), {
    proposalId: proposal.id,
    status: "rejected",
    message: "Improvement execution requires explicit approval.",
  });
});

test("executor reaches the execution boundary after explicit approval without changing the system", async () => {
  const executor = new ApprovedImprovementExecutor();

  assert.deepEqual(
    await executor.execute(proposal, { approved: true, reason: "Reviewed" }),
    {
      proposalId: proposal.id,
      status: "executed",
      message: "Improvement approved; execution boundary reached without modifying the system.",
    },
  );
});
