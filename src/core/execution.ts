import type { Task } from "./task.js";
import type { ImplementationContext } from "../planning/implementation-context.js";

export interface ExecutionResult {
  taskId: string;
  status: "completed" | "failed";
  message: string;
}

export interface TaskExecutor {
  execute(task: Task, implementationContext?: ImplementationContext): Promise<ExecutionResult>;
}

export class NoopTaskExecutor implements TaskExecutor {
  async execute(task: Task): Promise<ExecutionResult> {
    return {
      taskId: task.id,
      status: "completed",
      message: `Task accepted: ${task.title}`,
    };
  }
}
