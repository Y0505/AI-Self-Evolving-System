import type { ImprovementExecutionResult } from "./improvement-execution.js";

export interface ImprovementVerificationObservation {
  proposalId: string;
  passed: boolean;
  summary: string;
}

export interface ImprovementVerificationResult {
  proposalId: string;
  status: "verified" | "failed" | "unknown";
  summary: string;
}

export interface ImprovementVerifier {
  verify(
    execution: ImprovementExecutionResult,
    observation?: ImprovementVerificationObservation,
  ): ImprovementVerificationResult;
}

/**
 * Read-only boundary for checking the outcome of an improvement execution.
 *
 * Verification only evaluates an explicit observation supplied by the caller.
 * It does not modify source code, execute tools, deploy, commit, or remediate.
 */
export class DeterministicImprovementVerifier implements ImprovementVerifier {
  verify(
    execution: ImprovementExecutionResult,
    observation?: ImprovementVerificationObservation,
  ): ImprovementVerificationResult {
    if (execution.status !== "executed") {
      return {
        proposalId: execution.proposalId,
        status: "unknown",
        summary: "Improvement execution did not reach the execution boundary; verification is unknown.",
      };
    }

    if (!observation) {
      return {
        proposalId: execution.proposalId,
        status: "unknown",
        summary: "No verification observation was provided.",
      };
    }

    if (observation.proposalId !== execution.proposalId) {
      return {
        proposalId: execution.proposalId,
        status: "failed",
        summary: "Verification observation does not match the executed proposal.",
      };
    }

    return {
      proposalId: execution.proposalId,
      status: observation.passed ? "verified" : "failed",
      summary: observation.summary.trim(),
    };
  }
}
