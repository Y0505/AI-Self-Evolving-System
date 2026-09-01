import type { Task } from "../core/task.js";
import type { RepositorySnapshot } from "../repository/scanner.js";

export interface AIRequest {
  task: Task;
  repository: RepositorySnapshot;
  instructions?: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  model?: string;
}

export interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
