import type { ImplementationContext } from "../planning/implementation-context.js";
import type { AgentRunResult } from "../agent/agent-loop.js";
import type { Task } from "../core/task.js";
import type { ExecutionResult, TaskExecutor } from "../core/execution.js";
import type { AgentRuntime } from "./agent-runtime.js";

export class AgentTaskExecutor implements TaskExecutor {
  constructor(private readonly runtime: AgentRuntime) {}

  async execute(task: Task, implementationContext?: ImplementationContext): Promise<ExecutionResult> {
    try {
      const result: AgentRunResult = await this.runtime.run(task, task.description, implementationContext);
      return {
        taskId: task.id,
        status: "completed",
        message: result.content || `Task completed: ${task.title}`,
      };
    } catch (error) {
      return {
        taskId: task.id,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
