export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
}

export function createTask(title: string, description: string): Task {
  if (!title.trim()) {
    throw new Error("Task title cannot be empty");
  }

  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}
