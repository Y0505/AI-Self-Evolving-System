export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TaskProvenance {
  goalId: string;
  planStepId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  provenance?: TaskProvenance;
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
