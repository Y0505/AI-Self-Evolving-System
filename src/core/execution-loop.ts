import type { Task } from "./task.js";
import type { TaskExecutor, ExecutionResult } from "./execution.js";
import type { InMemoryTaskManager } from "./task-manager.js";

export class TaskExecutionLoop {
  constructor(
    private readonly taskManager: InMemoryTaskManager,
    private readonly executor: TaskExecutor,
  ) {}

  async run(taskId: string): Promise<ExecutionResult> {
    const task = this.taskManager.get(taskId);
    if (task.status !== "pending") {
      throw new Error(`Task is not pending: ${taskId}`);
    }

    this.taskManager.update(taskId, { status: "running", error: undefined });

    try {
      const result = await this.executor.execute(task);
      this.taskManager.update(taskId, {
        status: result.status,
        result: result.message,
        error: result.status === "failed" ? result.message : undefined,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result: ExecutionResult = {
        taskId,
        status: "failed",
        message,
      };
      this.taskManager.update(taskId, { status: "failed", error: message });
      return result;
    }
  }
}
