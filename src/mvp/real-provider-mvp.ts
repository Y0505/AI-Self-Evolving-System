import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { OpenAICompatibleProvider } from "../ai/openai-compatible-provider.js";
import { InMemoryTaskManager } from "../core/task-manager.js";
import { TaskExecutionLoop } from "../core/execution-loop.js";
import { AgentRuntime } from "../runtime/agent-runtime.js";
import { AgentTaskExecutor } from "../runtime/agent-task-executor.js";
import { DeterministicOpportunityEvaluator } from "../opportunity/opportunity-evaluator.js";
import { DeterministicGoalSelector } from "../opportunity/goal-selector.js";
import { DeterministicResearchClient } from "../research/research-client.js";
import type { PlanningClient, PlanningRequest, PlanningResult } from "../planning/planning-client.js";
import { DeterministicPlanTaskBridge } from "../planning/plan-task-bridge.js";
import { PlanTaskRegistrar } from "../planning/task-registration.js";
import { DeterministicImplementationContextBuilder } from "../planning/implementation-context.js";
import type { LearningRecord, LearningRecordStore } from "../learning/learning-record.js";
import { MvpRunner } from "./mvp-runner.js";

const execFileAsync = promisify(execFile);
const PROOF_PATH = "mvp-proof.txt";
const PROOF_CONTENT = "AI Self-Evolving System real-provider MVP validation passed.\n";

class FixedMvpPlanningClient implements PlanningClient {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    return {
      goalId: request.goal.opportunityId,
      summary: "Create and verify a small disposable-repository proof artifact.",
      steps: [
        {
          id: "create-proof",
          title: "Create the MVP proof artifact",
          description: `In the disposable repository, create ${PROOF_PATH} with exactly this single line: ${PROOF_CONTENT.trim()} Then use the read_file tool to verify the file contents. Do not modify any other file. Do not run Git mutation tools.`,
        },
      ],
    };
  }
}

class InMemoryLearningStore implements LearningRecordStore {
  private readonly records: LearningRecord[] = [];

  async save(record: LearningRecord): Promise<void> {
    this.records.push(record);
  }

  async listByTask(taskId: string): Promise<LearningRecord[]> {
    return this.records.filter((record) => record.taskId === taskId);
  }
}

async function assertDisposableRepository(root: string): Promise<void> {
  if (process.env.MVP_DISPOSABLE !== "1") {
    throw new Error("Refusing to run: set MVP_DISPOSABLE=1 to explicitly opt into disposable-repository validation.");
  }

  const marker = join(root, ".ai-self-evolving-disposable");
  try {
    await access(marker);
  } catch {
    throw new Error(`Refusing to run: disposable marker is missing at ${marker}`);
  }

  const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: root });
  if (stdout.trim()) {
    throw new Error("Refusing to run: disposable repository has uncommitted changes.");
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(requiredEnvironment("MVP_REPOSITORY_ROOT"));
  const endpoint = requiredEnvironment("AI_API_ENDPOINT");
  const model = requiredEnvironment("AI_MODEL");
  const apiKey = process.env.AI_API_KEY?.trim();

  await assertDisposableRepository(repositoryRoot);

  const provider = new OpenAICompatibleProvider({ endpoint, model, apiKey });
  const taskManager = new InMemoryTaskManager();
  const executionLoop = new TaskExecutionLoop(taskManager, new AgentTaskExecutor(new AgentRuntime({
    repositoryRoot,
    provider,
    maxToolCalls: 4,
    instructions: [
      "This is a disposable MVP validation run.",
      "Only modify the explicitly requested proof artifact.",
      "Do not use Git mutation tools, deployment tools, external network tools, or approval-gated tools.",
      "Stop after the requested artifact has been verified.",
    ].join("\n"),
  })));

  const runner = new MvpRunner({
    opportunityEvaluator: new DeterministicOpportunityEvaluator(),
    goalSelector: new DeterministicGoalSelector(),
    researchClient: new DeterministicResearchClient(),
    planningClient: new FixedMvpPlanningClient(),
    planTaskBridge: new DeterministicPlanTaskBridge(),
    taskRegistrar: new PlanTaskRegistrar(taskManager),
    implementationContextBuilder: new DeterministicImplementationContextBuilder(),
    executionLoop,
    learningStore: new InMemoryLearningStore(),
  });

  const result = await runner.run([
    {
      id: "real-provider-mvp",
      title: "Validate real-provider execution",
      problem: "Verify that a configured real AI provider can complete a bounded task in a disposable repository.",
      source: "manual-validation",
      evidence: ["Explicitly created disposable repository with a safety marker."],
      demandScore: 60,
      feasibilityScore: 95,
      impactScore: 70,
      monetizationScore: 40,
      strategicFitScore: 95,
    },
  ]);

  const proofPath = join(repositoryRoot, PROOF_PATH);
  let proof: string;
  try {
    proof = await readFile(proofPath, "utf8");
  } catch {
    throw new Error(`Real-provider validation failed: ${PROOF_PATH} was not created.`);
  }

  if (proof !== PROOF_CONTENT) {
    throw new Error(`Real-provider validation failed: ${PROOF_PATH} contents were not exact.`);
  }

  console.log(JSON.stringify({
    selectedGoal: result.selectedGoal?.title ?? null,
    evaluationScore: result.evaluation?.score ?? null,
    tasks: result.tasks.length,
    executions: result.executions.map(({ taskId, status }) => ({ taskId, status })),
    proof: PROOF_PATH,
    provider: "openai-compatible",
    model,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
