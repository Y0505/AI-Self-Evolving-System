import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryLearningRecordStore } from "./in-memory-learning-record-store.js";

const record = {
  id: "learning-1",
  taskId: "task-1",
  outcome: "success" as const,
  source: "health_check",
  summary: "Service remained healthy after deployment.",
  createdAt: "2026-09-05T00:00:00.000Z",
};

test("InMemoryLearningRecordStore saves and lists records by task", async () => {
  const store = new InMemoryLearningRecordStore();

  await store.save(record);
  await store.save({ ...record, id: "learning-2", taskId: "task-2" });

  assert.deepEqual(await store.listByTask("task-1"), [record]);
  assert.deepEqual(await store.listByTask("task-2"), [
    { ...record, id: "learning-2", taskId: "task-2" },
  ]);
});

test("InMemoryLearningRecordStore does not expose mutable internal records", async () => {
  const store = new InMemoryLearningRecordStore();
  await store.save(record);

  const records = await store.listByTask("task-1");
  records[0].summary = "changed outside the store";

  assert.deepEqual(await store.listByTask("task-1"), [record]);
});
