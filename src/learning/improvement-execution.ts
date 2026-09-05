import type { ImprovementProposal } from "./improvement-proposal.js";

export interface ImprovementApproval {
  approved: boolean;
  reason?: string;
}

export interface ImprovementExecutionResult {
  proposalId: string;
  status: "executed" | "rejected";
  message: string;
}

export interface ImprovementExecutor {
  execute(
    proposal: ImprovementProposal,
    approval?: ImprovementApproval,
  ): Promise<ImprovementExecutionResult>;
}

/**
 * Safety boundary for approved improvements.
 *
 * This milestone intentionally performs no source modification, git mutation,
 * deployment, or remediation. It only proves that execution cannot proceed
 * without explicit approval.
 */
export class ApprovedImprovementExecutor implements ImprovementExecutor {
  async execute(
    proposal: ImprovementProposal,
    approval?: ImprovementApproval,
  ): Promise<ImprovementExecutionResult> {
    if (!approval?.approved) {
      return {
        proposalId: proposal.id,
        status: "rejected",
        message: approval?.reason?.trim() || "Improvement execution requires explicit approval.",
      };
    }

    return {
      proposalId: proposal.id,
      status: "executed",
      message: "Improvement approved; execution boundary reached without modifying the system.",
    };
  }
}
