import type { AutonomousRunOrchestrator } from "./autonomous-run-orchestrator.js";
import type { AutonomousRunState } from "./autonomous-run-state-machine.js";

export interface AutonomousRunStep {
  state: AutonomousRunState;
  run: () => Promise<void>;
}

export interface AutonomousRunExecutionResult {
  state: AutonomousRunState;
  completed: boolean;
}

export class ControlledAutonomousRunExecution {
  constructor(private readonly orchestrator: AutonomousRunOrchestrator) {}

  async execute(steps: AutonomousRunStep[]): Promise<AutonomousRunExecutionResult> {
    try {
      for (const step of steps) {
        if (this.orchestrator.state !== step.state) await this.orchestrator.transition(step.state);
        await step.run();
      }
      await this.orchestrator.complete();
      return { state: this.orchestrator.state, completed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.orchestrator.fail(message);
      return { state: this.orchestrator.state, completed: false };
    }
  }
}
