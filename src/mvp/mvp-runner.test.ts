import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DeterministicOpportunityEvaluator, type Opportunity } from "../opportunity/opportunity-evaluator.js";
import { DeterministicGoalSelector } from "../opportunity/goal-selector.js";
import type { ResearchClient } from "../research/research-client.js";
import type { PlanningClient } from "../planning/planning-client.js";
import { DeterministicPlanTaskBridge } from "../planning/plan-task-bridge.js";
import { PlanTaskRegistrar } from "../planning/task-registration.js";
import { DeterministicImplementationContextBuilder } from "../planning/implementation-context.js";
import { InMemoryTaskManager } from "../core/task-manager.js";
import { TaskExecutionLoop } from "../core/execution-loop.js";
import { AgentRuntime } from "../runtime/agent-runtime.js";
import { AgentTaskExecutor } from "../runtime/agent-task-executor.js";
import { MvpRunner } from "./mvp-runner.js";
import type { AIProvider, AIRequest, AIResponse } from "../ai/provider.js";
import type { LearningRecord, LearningRecordStore } from "../learning/learning-record.js";

class CapturingProvider implements AIProvider {
  requests: AIRequest[] = [];

  async generate(request: AIRequest): Promise<AIResponse> {
    this.requests.push(request);
    return { content: JSON.stringify({ type: "final", content: "MVP task completed" }), provider: "test" };
  }
}

class TestResearchClient implements ResearchClient {
  async research({ goal }: Parameters<ResearchClient["research"]>[0]) {
    return { goalId: goal.opportunityId, summary: "Test research", findings: [] };
  }
}

class TestPlanningClient implements PlanningClient {
  async plan({ goal }: Parameters<PlanningClient["plan"]>[0]) {
    return {
      goalId: goal.opportunityId,
      summary: "Test plan",
      steps: [{ id: "step-1", title: "Build MVP", description: "Build the selected MVP" }],
    };
  }
}

class CapturingLearningStore implements LearningRecordStore {
  records: LearningRecord[] = [];

  async save(record: LearningRecord): Promise<void> {
    this.records.push(record);
  }

  async listByTask(taskId: string): Promise<LearningRecord[]> {
    return this.records.filter((record) => record.taskId === taskId);
  }
}

const opportunity: Opportunity = {
  id: "opportunity-1",
  title: "Test MVP",
  problem: "A test problem",
  source: "test",
  evidence: ["test evidence"],
  demandScore: 90,
  feasibilityScore: 90,
  impactScore: 80,
  monetizationScore: 80,
  strategicFitScore: 80,
};

test("runs the MVP loop from opportunity selection through bounded execution and learning", async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-self-evolving-mvp-"));
  try {
    await writeFile(join(root, "package.json"), "{}", "utf8");

    const provider = new CapturingProvider();
    const runtime = new AgentRuntime({ repositoryRoot: root, provider });
    const taskManager = new InMemoryTaskManager();
    const learningStore = new CapturingLearningStore();
    const taskRegistrar = new PlanTaskRegistrar(taskManager);
    const executionLoop = new TaskExecutionLoop(taskManager, new AgentTaskExecutor(runtime));

    const runner = new MvpRunner({
      opportunityEvaluator: new DeterministicOpportunityEvaluator(),
      goalSelector: new DeterministicGoalSelector(),
      researchClient: new TestResearchClient(),
      planningClient: new TestPlanningClient(),
      planTaskBridge: new DeterministicPlanTaskBridge(),
      taskRegistrar,
      implementationContextBuilder: new DeterministicImplementationContextBuilder(),
      executionLoop,
      learningStore,
    });

    const result = await runner.run([opportunity]);

    assert.equal(result.selectedGoal?.opportunityId, "opportunity-1");
    assert.equal(result.tasks.length, 1);
    assert.equal(result.executions[0]?.status, "completed");
    assert.equal(taskManager.get(result.tasks[0]!.id).status, "completed");
    assert.equal(learningStore.records[0]?.outcome, "success");
    assert.equal(provider.requests.length, 1);
    assert.equal(provider.requests[0]?.implementationContext?.goal.opportunityId, "opportunity-1");
    assert.equal(provider.requests[0]?.implementationContext?.task.id, result.tasks[0]!.id);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("stops cleanly when no opportunity is available", async () => {
  const learningStore = new CapturingLearningStore();
  const taskManager = new InMemoryTaskManager();
  const fakeRuntime = { run: async () => ({ content: "unused", toolResults: [] }) } as unknown as AgentRuntime;
  const runner = new MvpRunner({
    opportunityEvaluator: new DeterministicOpportunityEvaluator(),
    goalSelector: new DeterministicGoalSelector(),
    researchClient: new TestResearchClient(),
    planningClient: new TestPlanningClient(),
    planTaskBridge: new DeterministicPlanTaskBridge(),
    taskRegistrar: new PlanTaskRegistrar(taskManager),
    implementationContextBuilder: new DeterministicImplementationContextBuilder(),
    executionLoop: new TaskExecutionLoop(taskManager, new AgentTaskExecutor(fakeRuntime)),
    learningStore,
  });

  const result = await runner.run([]);
  assert.equal(result.selectedGoal, null);
  assert.equal(result.tasks.length, 0);
  assert.equal(learningStore.records.length, 0);
});
