export interface PullRequestChecksRequest {
  owner: string;
  repository: string;
  ref: string;
}

export interface PullRequestChecksResult {
  ref: string;
  total: number;
  completed: number;
  pending: number;
  successful: number;
  failed: number;
  allCompleted: boolean;
  allSuccessful: boolean;
}

export interface PullRequestChecksClient {
  get(request: PullRequestChecksRequest): Promise<PullRequestChecksResult>;
}

export interface GitHubPullRequestChecksClientOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class GitHubPullRequestChecksClient implements PullRequestChecksClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubPullRequestChecksClientOptions) {
    if (!options.token.trim()) throw new Error("GitHub token cannot be empty");
    this.token = options.token;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(request: PullRequestChecksRequest): Promise<PullRequestChecksResult> {
    if (!request.owner.trim() || !request.repository.trim()) {
      throw new Error("GitHub owner and repository are required");
    }
    if (!request.ref.trim() || request.ref.startsWith("-")) {
      throw new Error("GitHub check ref is required and cannot start with '-'");
    }

    const url = `${this.apiBaseUrl}/repos/${encodeURIComponent(request.owner)}/${encodeURIComponent(request.repository)}/commits/${encodeURIComponent(request.ref)}/check-runs`;
    const response = await this.fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) throw new Error(`GitHub check lookup failed with HTTP ${response.status}`);

    const payload = (await response.json()) as {
      check_runs?: Array<{ status?: string; conclusion?: string | null }>;
    };
    if (!Array.isArray(payload.check_runs)) {
      throw new Error("GitHub returned an incomplete check-runs response");
    }

    const runs = payload.check_runs;
    const completed = runs.filter((run) => run.status === "completed");
    const successful = completed.filter((run) => run.conclusion === "success");
    const failed = completed.length - successful.length;
    const pending = runs.length - completed.length;

    return {
      ref: request.ref.trim(),
      total: runs.length,
      completed: completed.length,
      pending,
      successful: successful.length,
      failed,
      allCompleted: pending === 0,
      allSuccessful: runs.length > 0 && pending === 0 && failed === 0,
    };
  }
}
