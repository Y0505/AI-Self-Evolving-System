export type DevelopmentAutonomyState =
  | "inspect"
  | "select_task"
  | "implement"
  | "test"
  | "diagnose"
  | "commit"
  | "create_pr"
  | "wait_ci"
  | "ready_for_review"
  | "blocked"
  | "completed";

export interface DevelopmentTask {
  id: string;
  title: string;
  source: "roadmap";
}

export interface DevelopmentPlan {
  tasks: DevelopmentTask[];
}

export interface DevelopmentObservation {
  state: DevelopmentAutonomyState;
  taskId?: string;
  detail: string;
}

export interface DevelopmentWorkspaceBoundary {
  inspect(): Promise<DevelopmentPlan>;
}

export interface DevelopmentImplementationBoundary {
  implement(task: DevelopmentTask): Promise<void>;
}

export interface DevelopmentTestBoundary {
  run(task: DevelopmentTask): Promise<{ passed: boolean; output: string }>;
}

export interface DevelopmentDiagnosisBoundary {
  diagnose(task: DevelopmentTask, output: string): Promise<"fix" | "blocked">;
}

export interface DevelopmentGitBoundary {
  prepare(task: DevelopmentTask): Promise<void>;
  commit(task: DevelopmentTask): Promise<void>;
  createPullRequest(task: DevelopmentTask): Promise<void>;
}

export interface DevelopmentCiBoundary {
  waitForChecks(task: DevelopmentTask): Promise<"passed" | "failed" | "pending">;
}

export interface DevelopmentAutonomyOptions {
  maxTasks?: number;
  maxFixAttemptsPerTask?: number;
  onObservation?: (observation: DevelopmentObservation) => void;
}

export interface DevelopmentAutonomyResult {
  state: DevelopmentAutonomyState;
  completedTaskIds: string[];
  blockedTaskId?: string;
  observations: DevelopmentObservation[];
}

/**
 * Controlled development loop. It can advance implementation and PR work,
 * but it deliberately stops at the human merge gate.
 */
export class DevelopmentAutonomyRunner {
  private readonly maxTasks: number;
  private readonly maxFixAttemptsPerTask: number;
  private observations: DevelopmentObservation[] = [];

  constructor(
    private readonly workspace: DevelopmentWorkspaceBoundary,
    private readonly implementation: DevelopmentImplementationBoundary,
    private readonly tests: DevelopmentTestBoundary,
    private readonly diagnosis: DevelopmentDiagnosisBoundary,
    private readonly git: DevelopmentGitBoundary,
    private readonly ci: DevelopmentCiBoundary,
    options: DevelopmentAutonomyOptions = {},
  ) {
    this.maxTasks = options.maxTasks ?? 1;
    this.maxFixAttemptsPerTask = options.maxFixAttemptsPerTask ?? 2;
    this.onObservation = options.onObservation;
  }

  private readonly onObservation?: (observation: DevelopmentObservation) => void;

  async run(): Promise<DevelopmentAutonomyResult> {
    this.observations = [];
    this.observe({ state: "inspect", detail: "Inspecting the repository and roadmap." });
    const plan = await this.workspace.inspect();

    const tasks = plan.tasks.slice(0, this.maxTasks);
    if (tasks.length === 0) {
      this.observe({ state: "completed", detail: "No incomplete development task was found." });
      return { state: "completed", completedTaskIds: [], observations: this.observations };
    }

    const completedTaskIds: string[] = [];

    for (const task of tasks) {
      this.observe({ state: "select_task", taskId: task.id, detail: task.title });
      this.observe({ state: "implement", taskId: task.id, detail: `Preparing an isolated branch for ${task.title}.` });
      await this.git.prepare(task);

      let attempts = 0;
      let passed = false;

      while (!passed) {
        this.observe({ state: "implement", taskId: task.id, detail: `Implementing ${task.title}.` });
        await this.implementation.implement(task);

        this.observe({ state: "test", taskId: task.id, detail: "Running focused validation." });
        const result = await this.tests.run(task);
        if (result.passed) {
          passed = true;
          break;
        }

        attempts += 1;
        if (attempts > this.maxFixAttemptsPerTask) {
          this.observe({ state: "blocked", taskId: task.id, detail: "Fix-attempt budget exhausted." });
          return { state: "blocked", completedTaskIds, blockedTaskId: task.id, observations: this.observations };
        }

        this.observe({ state: "diagnose", taskId: task.id, detail: `Diagnosing failed validation attempt ${attempts}.` });
        const decision = await this.diagnosis.diagnose(task, result.output);
        if (decision === "blocked") {
          this.observe({ state: "blocked", taskId: task.id, detail: "Failure diagnosis requires human intervention." });
          return { state: "blocked", completedTaskIds, blockedTaskId: task.id, observations: this.observations };
        }
      }

      this.observe({ state: "commit", taskId: task.id, detail: "Creating the reviewed commit boundary." });
      await this.git.commit(task);

      this.observe({ state: "create_pr", taskId: task.id, detail: "Creating a pull request." });
      await this.git.createPullRequest(task);

      this.observe({ state: "wait_ci", taskId: task.id, detail: "Waiting for CI checks." });
      const ciResult = await this.ci.waitForChecks(task);
      if (ciResult !== "passed") {
        this.observe({ state: "blocked", taskId: task.id, detail: `CI ${ciResult}; stopping before merge.` });
        return { state: "blocked", completedTaskIds, blockedTaskId: task.id, observations: this.observations };
      }

      completedTaskIds.push(task.id);
      this.observe({ state: "ready_for_review", taskId: task.id, detail: "CI passed; human merge/review gate remains." });
    }

    return { state: "ready_for_review", completedTaskIds, observations: this.observations };
  }

  private observe(observation: DevelopmentObservation): void {
    this.observations.push(observation);
    this.onObservation?.(observation);
  }
}
