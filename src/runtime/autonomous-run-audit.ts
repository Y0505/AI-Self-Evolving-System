import type { AutonomousRunState } from "./autonomous-run-state-machine.js";

export type AutonomousRunEventType =
  | "state_transition"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "approval_requested"
  | "approval_resolved"
  | "improvement_proposed"
  | "improvement_executed"
  | "improvement_verified"
  | "budget_exceeded"
  | "run_completed"
  | "run_failed";

export interface AutonomousRunEvent {
  id: string;
  runId: string;
  type: AutonomousRunEventType;
  createdAt: string;
  state?: AutonomousRunState;
  taskId?: string;
  proposalId?: string;
  message?: string;
  metadata?: Record<string, string>;
}

export interface AutonomousRunEventStore {
  append(event: AutonomousRunEvent): Promise<void>;
  listByRun(runId: string): Promise<AutonomousRunEvent[]>;
}

export class InMemoryAutonomousRunEventStore implements AutonomousRunEventStore {
  private readonly events: AutonomousRunEvent[] = [];

  async append(event: AutonomousRunEvent): Promise<void> {
    if (!event.id.trim()) throw new Error("Autonomous run event id is required.");
    if (!event.runId.trim()) throw new Error("Autonomous run event runId is required.");
    if (!event.createdAt.trim()) throw new Error("Autonomous run event createdAt is required.");

    this.events.push({
      ...event,
      metadata: event.metadata ? { ...event.metadata } : undefined,
    });
  }

  async listByRun(runId: string): Promise<AutonomousRunEvent[]> {
    return this.events
      .filter((event) => event.runId === runId)
      .map((event) => ({
        ...event,
        metadata: event.metadata ? { ...event.metadata } : undefined,
      }));
  }
}
