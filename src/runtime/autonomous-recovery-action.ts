import type { AutonomousRunRecoveryAction } from "./autonomous-run-recovery.js";
import type { AutonomousRunState } from "./autonomous-run-state-machine.js";

export interface AutonomousRecoveryActionResult {
  action: AutonomousRunRecoveryAction;
  nextState: AutonomousRunState | null;
  executed: boolean;
}

/**
 * Executes only recovery actions that are safe lifecycle transitions.
 * Retry remains caller-controlled so this boundary never repeats work implicitly.
 */
export function executeSafeRecoveryAction(
  action: AutonomousRunRecoveryAction,
): AutonomousRecoveryActionResult {
  switch (action) {
    case "stop":
      return { action, nextState: "failed", executed: true };
    case "wait_for_approval":
      return { action, nextState: "wait_for_approval", executed: true };
    case "learn_again":
      return { action, nextState: "learn_again", executed: true };
    case "retry":
      return { action, nextState: null, executed: false };
  }
}
