import type { LearningRecord, LearningRecordStore } from "./learning-record.js";

export class InMemoryLearningRecordStore implements LearningRecordStore {
  private readonly records: LearningRecord[] = [];

  async save(record: LearningRecord): Promise<void> {
    this.records.push({ ...record });
  }

  async listByTask(taskId: string): Promise<LearningRecord[]> {
    return this.records
      .filter((record) => record.taskId === taskId)
      .map((record) => ({ ...record }));
  }
}
