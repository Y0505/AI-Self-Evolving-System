import type { Task, TaskStatus } from "./task.js";

export interface ManagedTask extends Task {
  error?: string;
  result?: string;
}

export interface TaskUpdate {
  status?: TaskStatus;
  error?: string;
  result?: string;
}

export class InMemoryTaskManager {
  private readonly tasks = new Map<string, ManagedTask>();

  add(task: Task): ManagedTask {
    if (this.tasks.has(task.id)) throw new Error(`Task already exists: ${task.id}`);
    this.tasks.set(task.id, { ...task });
    return this.get(task.id);
  }

  get(taskId: string): ManagedTask {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return { ...task };
  }

  update(taskId: string, update: TaskUpdate): ManagedTask {
    const current = this.get(taskId);
    const next = { ...current, ...update };
    this.tasks.set(taskId, next);
    return this.get(taskId);
  }

  list(status?: TaskStatus): ManagedTask[] {
    return [...this.tasks.values()]
      .filter((task) => !status || task.status === status)
      .map((task) => ({ ...task }));
  }
}
