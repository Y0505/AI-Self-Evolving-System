import type { AutonomousRunOrchestrator } from "./autonomous-run-orchestrator.js";
import type { AutonomousRunFailure, AutonomousRunRecoveryAction } from "./autonomous-run-recovery.js";
import type { AutonomousRunState } from "./autonomous-run-state-machine.js";

export interface AutonomousRunStep {
  state: AutonomousRunState;
  run: () => Promise<void>;
  taskId?: string;
  classifyFailure?: (error: unknown) => AutonomousRunFailure;
}

export interface AutonomousRunExecutionResult {
  state: AutonomousRunState;
  completed: boolean;
  recoveryAction?: AutonomousRunRecoveryAction;
}

export class ControlledAutonomousRunExecution {
  constructor(private readonly orchestrator: AutonomousRunOrchestrator) {}

  async execute(steps: AutonomousRunStep[]): Promise<AutonomousRunExecutionResult> {
    try {
      for (const step of steps) {
        if (this.orchestrator.state !== step.state) await this.orchestrator.transition(step.state);

        try {
          await step.run();
        } catch (error) {
          if (!step.taskId?.trim()) throw error;

          const failure = step.classifyFailure?.(error) ?? {
            kind: "task_failure",
            message: error instanceof Error ? error.message : String(error),
            retryCount: 0,
          } satisfies AutonomousRunFailure;

          const recoveryAction = await this.orchestrator.recordTaskFailure(step.taskId, failure);
          return {
            state: this.orchestrator.state,
            completed: false,
            recoveryAction,
          };
        }
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
