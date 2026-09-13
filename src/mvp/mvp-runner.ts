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
import type { RichLearningAnalyzer, RichLearningSummary } from "../learning/richer-learning-analysis.js";
import type { RichImprovementProposer } from "../learning/improvement-proposal-from-rich-analysis.js";
import type { ImprovementProposal } from "../learning/improvement-proposal.js";
import { DeterministicRichLearningAnalyzer } from "../learning/richer-learning-analysis.js";
import { DeterministicRichImprovementProposer } from "../learning/improvement-proposal-from-rich-analysis.js";

export interface MvpRunResult {
  selectedGoal: SelectedGoal | null;
  evaluation: OpportunityEvaluation | null;
  research: ResearchResult | null;
  plan: PlanningResult | null;
  tasks: Task[];
  executions: ExecutionResult[];
  learning: RichLearningSummary | null;
  improvementProposals: ImprovementProposal[];
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
  learningAnalyzer?: RichLearningAnalyzer;
  improvementProposer?: RichImprovementProposer;
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
      return { selectedGoal: null, evaluation: null, research: null, plan: null, tasks: [], executions: [], learning: null, improvementProposals: [] };
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
      const context = this.dependencies.implementationContextBuilder.build({ goal: selectedGoal, research, plan, task });
      const execution = await this.dependencies.executionLoop.run(task.id, context);
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

    const learningRecords = (await Promise.all(
      registeredTasks.map((task) => this.dependencies.learningStore.listByTask(task.id)),
    )).flat();
    const learning = (this.dependencies.learningAnalyzer ?? new DeterministicRichLearningAnalyzer()).analyze(learningRecords);
    const improvementProposals = (this.dependencies.improvementProposer ?? new DeterministicRichImprovementProposer()).propose(learning);

    return {
      selectedGoal,
      evaluation: selectedEvaluation,
      research,
      plan,
      tasks: registeredTasks,
      executions,
      learning,
      improvementProposals,
    };
  }
}
