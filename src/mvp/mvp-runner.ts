import type { Opportunity, OpportunityEvaluation, OpportunityEvaluator } from "../opportunity/opportunity-evaluator.js";
import type { GoalSelector, SelectedGoal } from "../opportunity/goal-selector.js";
import type { ResearchClient, ResearchResult } from "../research/research-client.js";
import type { PlanningClient, PlanningResult } from "../planning/planning-client.js";
import type { PlanTaskBridge } from "../planning/plan-task-bridge.js";
import type { TaskRegistrar } from "../planning/task-registration.js";
import type { ImplementationContextBuilder } from "../planning/implementation-context.js";
import type { Task } from "../core/task.js";
import type { TaskExecutionLoop } from "../core/execution-loop.js";
import type { ExecutionResult } from "../core/execution.js";
import type { LearningRecord, LearningRecordStore } from "../learning/learning-record.js";

export interface MvpRunResult {
  selectedGoal: SelectedGoal | null;
  evaluation: OpportunityEvaluation | null;
  research: ResearchResult | null;
  plan: PlanningResult | null;
  tasks: Task[];
  executions: ExecutionResult[];
}

export interface MvpRunnerDependencies {
  opportunityEvaluator: OpportunityEvaluator;
  goalSelector: GoalSelector;
  researchClient: ResearchClient;
  planningClient: PlanningClient;
  planTaskBridge: PlanTaskBridge;
  taskRegistrar: TaskRegistrar;
  implementationContextBuilder: ImplementationContextBuilder;
  executionLoop: TaskExecutionLoop;
  learningStore: LearningRecordStore;
}

export class MvpRunner {
  constructor(private readonly dependencies: MvpRunnerDependencies) {}

  async run(opportunities: Opportunity[]): Promise<MvpRunResult> {
    const evaluations = opportunities.map((opportunity) => ({
      opportunity,
      evaluation: this.dependencies.opportunityEvaluator.evaluate(opportunity),
    }));

    const selectedGoal = this.dependencies.goalSelector.select(evaluations);
    if (!selectedGoal) {
      return { selectedGoal: null, evaluation: null, research: null, plan: null, tasks: [], executions: [] };
    }

    const selectedEvaluation = evaluations.find(
      ({ evaluation }) => evaluation.opportunityId === selectedGoal.opportunityId,
    )?.evaluation ?? null;

    const research = await this.dependencies.researchClient.research({ goal: selectedGoal, questions: [] });
    const plan = await this.dependencies.planningClient.plan({ goal: selectedGoal, research });
    const drafts = this.dependencies.planTaskBridge.createTasks(plan);
    const registeredTasks = this.dependencies.taskRegistrar.register(drafts);

    const executions: ExecutionResult[] = [];
    for (const task of registeredTasks) {
      this.dependencies.implementationContextBuilder.build({ goal: selectedGoal, research, plan, task });
      const execution = await this.dependencies.executionLoop.run(task.id);
      executions.push(execution);

      const record: LearningRecord = {
        id: `${task.id}:${execution.status}`,
        taskId: task.id,
        outcome: execution.status === "completed" ? "success" : "failure",
        source: "mvp-runner",
        summary: execution.message,
        createdAt: new Date().toISOString(),
      };
      await this.dependencies.learningStore.save(record);
    }

    return { selectedGoal, evaluation: selectedEvaluation, research, plan, tasks: registeredTasks, executions };
  }
}
