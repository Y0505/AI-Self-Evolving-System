import { createTask } from "../core/task.js";
import { OpenAICompatibleProvider } from "../ai/openai-compatible-provider.js";
import { AgentRuntime } from "../runtime/agent-runtime.js";
import { createRunTestsTool, type TestRunResult } from "../tools/test-runner.js";
import type { ToolApprovalService } from "../tools/approval.js";
import { runGitCommand } from "../git/git-command.js";
import { GitHubPullRequestClient } from "../github/pull-request-client.js";
import { GitHubPullRequestChecksClient } from "../github/pull-request-checks-client.js";
import type {
  DevelopmentCiBoundary,
  DevelopmentDiagnosisBoundary,
  DevelopmentGitBoundary,
  DevelopmentImplementationBoundary,
  DevelopmentTask,
  DevelopmentTestBoundary,
} from "./development-autonomy-runner.js";
import { runDevelopmentAutonomy } from "./development-autonomy-entrypoint.js";

const repositoryRoot = process.env.GITHUB_WORKSPACE ?? process.cwd();
const githubRepository = process.env.GITHUB_REPOSITORY ?? "";
const githubToken = process.env.GITHUB_TOKEN ?? "";
const aiEndpoint = process.env.AI_API_ENDPOINT ?? "";
const aiModel = process.env.AI_MODEL ?? "";
const aiApiKey = process.env.AI_API_KEY;

function required(name: string, value: string): string {
  if (!value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function repositoryParts(): { owner: string; repository: string } {
  const [owner, repository] = required("GITHUB_REPOSITORY", githubRepository).split("/");
  if (!owner || !repository) throw new Error("GITHUB_REPOSITORY must be owner/repository");
  return { owner, repository };
}

const { owner, repository } = repositoryParts();
const provider = new OpenAICompatibleProvider({
  endpoint: required("AI_API_ENDPOINT", aiEndpoint),
  model: required("AI_MODEL", aiModel),
  apiKey: aiApiKey,
});

/**
 * Automation is explicitly allowed to implement, commit, push and open a PR.
 * The model itself is still denied approval-gated Git operations so the
 * deterministic development runner remains the only actor performing them.
 */
const denyModelMutations: ToolApprovalService = {
  async requestApproval() {
    return false;
  },
};

function createAgent(instructions: string): AgentRuntime {
  return new AgentRuntime({
    repositoryRoot,
    provider,
    instructions,
    maxToolCalls: Number(process.env.DEVELOPMENT_MAX_TOOL_CALLS ?? "12"),
    maxConsecutiveToolErrors: 3,
    maxRepeatedToolCalls: 2,
    testTimeoutMs: 60_000,
    approval: denyModelMutations,
  });
}

const implementation: DevelopmentImplementationBoundary = {
  async implement(task) {
    const agent = createAgent([
      "You are implementing exactly one roadmap task inside a controlled autonomous development run.",
      "Inspect the repository before changing anything.",
      "Implement the task completely using the existing architecture and tests.",
      "Do not commit, push, create pull requests, merge, deploy, spend money, contact users, or access secrets.",
      "Do not install dependencies unless the task explicitly requires an existing dependency already declared by the project.",
      "Keep changes minimal, original, license-compatible, and production-quality.",
    ].join("\n"));

    await agent.run(
      createTask(task.title, `Implement roadmap task: ${task.title}`),
      `Implement this roadmap task now: ${task.title}`,
    );
  },
};

const diagnosis: DevelopmentDiagnosisBoundary = {
  async diagnose(task, output) {
    const agent = createAgent([
      "You are diagnosing a failed validation in a controlled autonomous development run.",
      "Inspect the repository and failure output, then fix the root cause if it is safe and clearly attributable to the current task.",
      "Do not commit, push, create pull requests, merge, deploy, spend money, contact users, or access secrets.",
      "If the failure is unrelated, ambiguous, destructive to fix safely, or requires human judgment, explain that and stop without making speculative changes.",
    ].join("\n"));

    try {
      await agent.run(
        createTask(task.title, `Diagnose and fix the validation failure for: ${task.title}`),
        `Validation failed for ${task.title}. Failure output:\n${output}`,
      );
      return "fix";
    } catch {
      return "blocked";
    }
  },
};

const tests: DevelopmentTestBoundary = {
  async run(_task) {
    const tool = createRunTestsTool(60_000);
    const context = { workspaceRoot: repositoryRoot };
    const build = await tool.execute({ profile: "build" }, context);
    if (!isSuccessful(build)) {
      return { passed: false, output: formatTestOutput(build) };
    }

    const test = await tool.execute({ profile: "test" }, context);
    return {
      passed: isSuccessful(test),
      output: `${formatTestOutput(build)}\n${formatTestOutput(test)}`,
    };
  },
};

class GitHubDevelopmentGitBoundary implements DevelopmentGitBoundary {
  private branchName = "";
  private pullRequestNumber = 0;
  private pullRequestRef = "";

  constructor(
    private readonly root: string,
    private readonly token: string,
    private readonly client: GitHubPullRequestClient,
  ) {}

  async prepare(task: DevelopmentTask): Promise<void> {
    const status = await runGitCommand(["status", "--porcelain"], { cwd: this.root });
    if (status.exitCode !== 0) throw new Error(`Unable to inspect Git status: ${status.stderr}`);
    if (status.stdout.trim()) throw new Error("Autonomous development requires a clean working tree");

    const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "task";
    this.branchName = `auto/dev/${slug}-${Date.now()}`;
    const result = await runGitCommand(["checkout", "-b", this.branchName], { cwd: this.root });
    if (result.exitCode !== 0) throw new Error(`Unable to create autonomous branch: ${result.stderr}`);
  }

  async commit(task: DevelopmentTask): Promise<void> {
    if (!this.branchName) throw new Error("Autonomous branch was not prepared");
    const status = await runGitCommand(["status", "--porcelain=v1"], { cwd: this.root });
    if (status.exitCode !== 0) throw new Error(`Unable to inspect changed files: ${status.stderr}`);

    const paths = status.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3).split(" -> ").pop() ?? "")
      .filter(Boolean);
    if (paths.length === 0) throw new Error("Autonomous implementation produced no Git changes");
    for (const path of paths) {
      if (/(^|\/)(\.env|\.env\.|.*\.pem$|.*\.key$|credentials|secrets?)(\/|$)/i.test(path) && path !== ".env.example") {
        throw new Error(`Refusing to stage sensitive-looking path: ${path}`);
      }
    }

    const staged = await runGitCommand(["add", "--", ...paths], { cwd: this.root });
    if (staged.exitCode !== 0) throw new Error(`Git staging failed: ${staged.stderr}`);

    const message = `feat: autonomously implement ${task.title.replace(/[\r\n]/g, " ").slice(0, 120)}`;
    const committed = await runGitCommand(["commit", "-m", message], { cwd: this.root });
    if (committed.exitCode !== 0) throw new Error(`Git commit failed: ${committed.stderr}`);

    const pushed = await runGitCommand(["push", "--set-upstream", "origin", `HEAD:${this.branchName}`], { cwd: this.root });
    if (pushed.exitCode !== 0) throw new Error(`Git push failed: ${pushed.stderr}`);

    await this.dispatchCi();
  }

  async createPullRequest(task: DevelopmentTask): Promise<void> {
    if (!this.branchName) throw new Error("Autonomous branch was not prepared");
    const result = await this.client.create({
      owner,
      repository,
      title: `feat: ${task.title}`,
      body: [
        "## Autonomous development run",
        "",
        `Roadmap task: **${task.title}**`,
        "",
        "This PR was created by the controlled development autonomy runner.",
        "It does not merge to main, deploy production, spend money, or perform external outreach.",
      ].join("\n"),
      head: this.branchName,
      base: "main",
    });
    this.pullRequestNumber = result.number;
    this.pullRequestRef = result.head;
  }

  getPullRequestRef(): string {
    if (!this.pullRequestRef || !this.pullRequestNumber) throw new Error("Pull request has not been created");
    return this.pullRequestRef;
  }

  private async dispatchCi(): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions/workflows/ci.yml/dispatches`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: this.branchName }),
    });
    if (!response.ok) {
      throw new Error(`GitHub CI dispatch failed with HTTP ${response.status}`);
    }
  }
}

const git = new GitHubDevelopmentGitBoundary(
  repositoryRoot,
  required("GITHUB_TOKEN", githubToken),
  new GitHubPullRequestClient({ token: required("GITHUB_TOKEN", githubToken) }),
);

const checksClient = new GitHubPullRequestChecksClient({ token: githubToken });
const ci: DevelopmentCiBoundary = {
  async waitForChecks(_task) {
    const ref = git.getPullRequestRef();
    const timeoutMs = Number(process.env.DEVELOPMENT_CI_TIMEOUT_MS ?? "300000");
    const pollMs = Number(process.env.DEVELOPMENT_CI_POLL_MS ?? "10000");
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await checksClient.get({ owner, repository, ref });
      if (result.allSuccessful) return "passed";
      if (result.allCompleted && result.failed > 0) return "failed";
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }

    return "pending";
  },
};

const result = await runDevelopmentAutonomy({
  repositoryRoot,
  implementation,
  tests,
  diagnosis,
  git,
  ci,
  maxTasks: Number(process.env.DEVELOPMENT_MAX_TASKS ?? "1"),
  maxFixAttemptsPerTask: Number(process.env.DEVELOPMENT_MAX_FIX_ATTEMPTS ?? "2"),
  onObservation: (observation) => console.log(`[development-autonomy] ${observation.state}: ${observation.detail}`),
});

console.log(JSON.stringify(result, null, 2));
if (result.state === "blocked") process.exitCode = 2;

function isSuccessful(result: TestRunResult): boolean {
  return result.exitCode === 0 && !result.timedOut;
}

function formatTestOutput(result: TestRunResult): string {
  return [
    `${result.profile}: ${result.exitCode === 0 && !result.timedOut ? "passed" : "failed"}`,
    result.stdout,
    result.stderr,
  ].filter(Boolean).join("\n");
}
