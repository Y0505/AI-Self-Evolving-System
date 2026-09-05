export type LearningOutcome = "success" | "failure" | "unknown";

export interface LearningRecord {
  id: string;
  taskId: string;
  outcome: LearningOutcome;
  source: string;
  summary: string;
  createdAt: string;
}

export interface LearningRecordStore {
  save(record: LearningRecord): Promise<void>;
  listByTask(taskId: string): Promise<LearningRecord[]>;
}
