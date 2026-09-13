import type { ImprovementProposal } from "./improvement-proposal.js";

export interface ImprovementApprovalRequest {
  proposal: ImprovementProposal;
}

export interface ImprovementApprovalService {
  requestApproval(request: ImprovementApprovalRequest): Promise<boolean>;
}

export interface ImprovementCheckpointResult {
  proposalId: string;
  status: "approved" | "rejected";
}

/**
 * Approval boundary for proposed improvements.
 * Approval only authorizes the proposal to proceed to a separate execution boundary;
 * this checkpoint never mutates source code, executes tools, deploys, or commits.
 */
export class ImprovementCheckpoint {
  constructor(private readonly approval: ImprovementApprovalService) {}

  async check(proposal: ImprovementProposal): Promise<ImprovementCheckpointResult> {
    const approved = await this.approval.requestApproval({ proposal });
    return {
      proposalId: proposal.id,
      status: approved ? "approved" : "rejected",
    };
  }
}
