export type AutonomousRunFailureKind =
  | "task_failure"
  | "budget_exceeded"
  | "approval_rejected"
  | "verification_failed"
  | "invalid_transition";

export type AutonomousRunRecoveryAction =
  | "retry"
  | "stop"
  | "wait_for_approval"
  | "learn_again";

export interface AutonomousRunFailure {
  kind: AutonomousRunFailureKind;
  message: string;
  retryCount: number;
}

export interface AutonomousRunRecoveryPolicy {
  decide(failure: AutonomousRunFailure): AutonomousRunRecoveryAction;
}

export class DeterministicAutonomousRunRecoveryPolicy implements AutonomousRunRecoveryPolicy {
  constructor(private readonly maxRetries: number) {
    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error("Recovery maxRetries must be a non-negative integer.");
    }
  }

  decide(failure: AutonomousRunFailure): AutonomousRunRecoveryAction {
    if (!Number.isInteger(failure.retryCount) || failure.retryCount < 0) {
      throw new Error("Recovery retryCount must be a non-negative integer.");
    }

    switch (failure.kind) {
      case "task_failure":
        return failure.retryCount < this.maxRetries ? "retry" : "stop";
      case "approval_rejected":
      case "verification_failed":
        return "learn_again";
      case "budget_exceeded":
      case "invalid_transition":
        return "stop";
    }
  }
}
