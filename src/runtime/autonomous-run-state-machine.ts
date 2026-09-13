export const AUTONOMOUS_RUN_STATES = [
  "discover",
  "evaluate",
  "select_goal",
  "research",
  "plan",
  "build",
  "test",
  "deploy",
  "observe",
  "learn",
  "propose_improvement",
  "wait_for_approval",
  "execute_improvement",
  "verify_improvement",
  "learn_again",
  "completed",
  "failed",
] as const;

export type AutonomousRunState = (typeof AUTONOMOUS_RUN_STATES)[number];

const transitions: Record<AutonomousRunState, readonly AutonomousRunState[]> = {
  discover: ["evaluate", "failed"],
  evaluate: ["select_goal", "failed"],
  select_goal: ["research", "failed"],
  research: ["plan", "failed"],
  plan: ["build", "failed"],
  build: ["test", "failed"],
  test: ["deploy", "observe", "failed"],
  deploy: ["observe", "failed"],
  observe: ["learn", "failed"],
  learn: ["propose_improvement", "completed", "failed"],
  propose_improvement: ["wait_for_approval", "completed", "failed"],
  wait_for_approval: ["execute_improvement", "learn_again", "failed"],
  execute_improvement: ["verify_improvement", "failed"],
  verify_improvement: ["learn_again", "failed"],
  learn_again: ["propose_improvement", "completed", "failed"],
  completed: [],
  failed: [],
};

export interface AutonomousRunStateMachine {
  readonly state: AutonomousRunState;
  canTransitionTo(next: AutonomousRunState): boolean;
  transitionTo(next: AutonomousRunState): AutonomousRunState;
}

export class ControlledAutonomousRunStateMachine implements AutonomousRunStateMachine {
  private currentState: AutonomousRunState;

  constructor(initialState: AutonomousRunState = "discover") {
    this.currentState = initialState;
  }

  get state(): AutonomousRunState {
    return this.currentState;
  }

  canTransitionTo(next: AutonomousRunState): boolean {
    return transitions[this.currentState].includes(next);
  }

  transitionTo(next: AutonomousRunState): AutonomousRunState {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Invalid autonomous run transition: ${this.currentState} -> ${next}`);
    }

    this.currentState = next;
    return this.currentState;
  }
}
