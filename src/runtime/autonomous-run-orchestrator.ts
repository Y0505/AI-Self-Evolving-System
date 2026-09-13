import type { AutonomousRunEvent, AutonomousRunEventStore } from "./autonomous-run-audit.js";
import type {
  AutonomousRunFailure,
  AutonomousRunRecoveryAction,
  AutonomousRunRecoveryPolicy,
} from "./autonomous-run-recovery.js";
import type { AutonomousRunState, AutonomousRunStateMachine } from "./autonomous-run-state-machine.js";
import type { DeterministicExecutionBudget } from "./execution-budget.js";

export interface AutonomousRunOrchestratorDependencies {
  stateMachine: AutonomousRunStateMachine;
  budget: DeterministicExecutionBudget;
  audit: AutonomousRunEventStore;
  recovery: AutonomousRunRecoveryPolicy;
  now?: () => string;
  createEventId?: () => string;
}

export interface AutonomousRunOrchestrator {
  readonly state: AutonomousRunState;
  transition(next: AutonomousRunState, message?: string): Promise<AutonomousRunState>;
  recordTaskStart(taskId: string): Promise<void>;
  recordTaskCompletion(taskId: string, message?: string): Promise<void>;
  recordTaskFailure(taskId: string, failure: AutonomousRunFailure): Promise<AutonomousRunRecoveryAction>;
  recordBudgetExceeded(metric: string, message: string): Promise<AutonomousRunRecoveryAction>;
  complete(message?: string): Promise<void>;
  fail(message: string): Promise<void>;
}

export class ControlledAutonomousRunOrchestrator implements AutonomousRunOrchestrator {
  private readonly now: () => string;
  private readonly createEventId: () => string;

  constructor(
    private readonly runId: string,
    private readonly dependencies: AutonomousRunOrchestratorDependencies,
  ) {
    if (!runId.trim()) throw new Error("Autonomous run id is required.");
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.createEventId = dependencies.createEventId ?? (() => `${runId}:${this.now()}:${Math.random()}`);
  }

  get state(): AutonomousRunState {
    return this.dependencies.stateMachine.state;
  }

  async transition(next: AutonomousRunState, message?: string): Promise<AutonomousRunState> {
    const previous = this.state;
    const state = this.dependencies.stateMachine.transitionTo(next);
    await this.append({ type: "state_transition", state, message: message?.trim() || `${previous} -> ${state}` });
    return state;
  }

  async recordTaskStart(taskId: string): Promise<void> {
    this.requireValue(taskId, "task id");
    this.dependencies.budget.consume("tasks");
    await this.append({ type: "task_started", state: this.state, taskId });
  }

  async recordTaskCompletion(taskId: string, message?: string): Promise<void> {
    this.requireValue(taskId, "task id");
    await this.append({ type: "task_completed", state: this.state, taskId, message: message?.trim() });
  }

  async recordTaskFailure(taskId: string, failure: AutonomousRunFailure): Promise<AutonomousRunRecoveryAction> {
    this.requireValue(taskId, "task id");
    const action = this.dependencies.recovery.decide(failure);
    await this.append({
      type: "task_failed",
      state: this.state,
      taskId,
      message: failure.message,
      metadata: { recoveryAction: action, retryCount: String(failure.retryCount) },
    });
    return action;
  }

  async recordBudgetExceeded(metric: string, message: string): Promise<AutonomousRunRecoveryAction> {
    this.requireValue(metric, "budget metric");
    this.requireValue(message, "budget message");
    const recoveryAction = this.dependencies.recovery.decide({
      kind: "budget_exceeded",
      message,
      retryCount: 0,
    });
    await this.append({
      type: "budget_exceeded",
      state: this.state,
      message,
      metadata: { metric, recoveryAction },
    });
    return recoveryAction;
  }

  async complete(message?: string): Promise<void> {
    if (this.state !== "completed") await this.transition("completed", message ?? "Autonomous run completed.");
    await this.append({ type: "run_completed", state: "completed", message });
  }

  async fail(message: string): Promise<void> {
    this.requireValue(message, "failure message");
    if (this.state !== "failed") await this.transition("failed", message);
    await this.append({ type: "run_failed", state: "failed", message });
  }

  private async append(event: Omit<AutonomousRunEvent, "id" | "runId" | "createdAt">): Promise<void> {
    await this.dependencies.audit.append({ ...event, id: this.createEventId(), runId: this.runId, createdAt: this.now() });
  }

  private requireValue(value: string, label: string): void {
    if (!value.trim()) throw new Error(`Autonomous run ${label} is required.`);
  }
}
