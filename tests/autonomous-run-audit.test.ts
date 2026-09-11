import assert from "node:assert/strict";
import test from "node:test";
import {
  InMemoryAutonomousRunEventStore,
} from "../src/runtime/autonomous-run-audit.js";

test("audit store keeps events isolated by run and preserves insertion order", async () => {
  const store = new InMemoryAutonomousRunEventStore();

  await store.append({
    id: "event-1",
    runId: "run-a",
    type: "state_transition",
    createdAt: "2026-09-11T10:00:00.000Z",
    message: "discover -> evaluate",
  });
  await store.append({
    id: "event-2",
    runId: "run-b",
    type: "run_failed",
    createdAt: "2026-09-11T10:01:00.000Z",
  });
  await store.append({
    id: "event-3",
    runId: "run-a",
    type: "task_completed",
    createdAt: "2026-09-11T10:02:00.000Z",
    taskId: "task-1",
  });

  const events = await store.listByRun("run-a");
  assert.deepEqual(events.map((event) => event.id), ["event-1", "event-3"]);
  assert.equal((await store.listByRun("run-b"))[0]?.id, "event-2");
});

test("audit store preserves optional fields and protects stored metadata from mutation", async () => {
  const store = new InMemoryAutonomousRunEventStore();
  const metadata = { source: "mvp", reason: "budget" };

  await store.append({
    id: "event-1",
    runId: "run-a",
    type: "budget_exceeded",
    createdAt: "2026-09-11T10:00:00.000Z",
    state: "build",
    taskId: "task-1",
    proposalId: "proposal-1",
    message: "tool call budget reached",
    metadata,
  });

  metadata.source = "mutated";
  const events = await store.listByRun("run-a");
  assert.equal(events[0]?.metadata?.source, "mvp");

  events[0]!.metadata!.reason = "changed externally";
  const reread = await store.listByRun("run-a");
  assert.equal(reread[0]?.metadata?.reason, "budget");
  assert.equal(reread[0]?.proposalId, "proposal-1");
  assert.equal(reread[0]?.taskId, "task-1");
});

test("audit store rejects events without required identity fields", async () => {
  const store = new InMemoryAutonomousRunEventStore();

  await assert.rejects(
    () => store.append({ id: "", runId: "run-a", type: "run_completed", createdAt: "now" }),
    /event id is required/,
  );
  await assert.rejects(
    () => store.append({ id: "event-1", runId: "", type: "run_completed", createdAt: "now" }),
    /event runId is required/,
  );
  await assert.rejects(
    () => store.append({ id: "event-1", runId: "run-a", type: "run_completed", createdAt: "" }),
    /event createdAt is required/,
  );
});
