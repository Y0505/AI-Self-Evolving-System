import type { ImprovementCheckpoint } from "./improvement-checkpoint.js";
import type { ImprovementExecutionResult, ImprovementExecutor } from "./improvement-execution.js";
import type {
  ImprovementVerificationObservation,
  ImprovementVerificationResult,
  ImprovementVerifier,
} from "./improvement-verification.js";
import type { ImprovementProposal } from "./improvement-proposal.js";

export interface ImprovementLifecycleResult {
  proposalId: string;
  approval: "approved" | "rejected";
  execution: ImprovementExecutionResult | null;
  verification: ImprovementVerificationResult | null;
}

export interface ImprovementLifecycle {
  run(
    proposal: ImprovementProposal,
    observation?: ImprovementVerificationObservation,
  ): Promise<ImprovementLifecycleResult>;
}

/**
 * Composes the existing approval, execution, and verification boundaries.
 * The lifecycle itself performs no mutation and cannot bypass approval.
 */
export class ControlledImprovementLifecycle implements ImprovementLifecycle {
  constructor(
    private readonly checkpoint: ImprovementCheckpoint,
    private readonly executor: ImprovementExecutor,
    private readonly verifier: ImprovementVerifier,
  ) {}

  async run(
    proposal: ImprovementProposal,
    observation?: ImprovementVerificationObservation,
  ): Promise<ImprovementLifecycleResult> {
    const approval = await this.checkpoint.check(proposal);
    if (approval.status === "rejected") {
      return {
        proposalId: proposal.id,
        approval: "rejected",
        execution: null,
        verification: null,
      };
    }

    const execution = await this.executor.execute(proposal, { approved: true });
    const verification = this.verifier.verify(execution, observation);

    return {
      proposalId: proposal.id,
      approval: "approved",
      execution,
      verification,
    };
  }
}
