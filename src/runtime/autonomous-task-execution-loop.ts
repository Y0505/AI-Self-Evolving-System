import type { ImplementationContext } from "../planning/implementation-context.js";
import type { ExecutionResult } from "../core/execution.js";
import type { AutonomousRunOrchestrator } from "./autonomous-run-orchestrator.js";
import { ExecutionBudgetExceededError } from "./execution-budget.js";

export interface TaskExecutionBoundary {
  run(taskId: string, implementationContext?: ImplementationContext): Promise<ExecutionResult>;
}

export class ControlledAutonomousTaskExecutionLoop implements TaskExecutionBoundary {
  constructor(
    private readonly executionLoop: TaskExecutionBoundary,
    private readonly orchestrator: AutonomousRunOrchestrator,
  ) {}

  async run(taskId: string, implementationContext?: ImplementationContext): Promise<ExecutionResult> {
    try {
      await this.orchestrator.recordTaskStart(taskId);
      const result = await this.executionLoop.run(taskId, implementationContext);

      if (result.status === "completed") {
        await this.orchestrator.recordTaskCompletion(taskId, result.message);
      } else {
        await this.orchestrator.recordTaskFailure(taskId, {
          kind: "task_failure",
          message: result.message,
          retryCount: 0,
        });
      }

      return result;
    } catch (error) {
      if (error instanceof ExecutionBudgetExceededError) {
        await this.orchestrator.recordBudgetExceeded(error.metric, error.message);
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      await this.orchestrator.recordTaskFailure(taskId, {
        kind: "task_failure",
        message,
        retryCount: 0,
      });
      throw error;
    }
  }
}
