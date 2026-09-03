export interface PullRequestStatusRequest {
  owner: string;
  repository: string;
  number: number;
}

export interface PullRequestStatusResult {
  number: number;
  state: "open" | "closed";
  merged: boolean;
  mergeable: boolean | null;
}

export interface PullRequestStatusClient {
  get(request: PullRequestStatusRequest): Promise<PullRequestStatusResult>;
}

export interface GitHubPullRequestStatusClientOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class GitHubPullRequestStatusClient implements PullRequestStatusClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubPullRequestStatusClientOptions) {
    if (!options.token.trim()) throw new Error("GitHub token cannot be empty");
    this.token = options.token;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(request: PullRequestStatusRequest): Promise<PullRequestStatusResult> {
    if (!request.owner.trim() || !request.repository.trim()) throw new Error("GitHub owner and repository are required");
    if (!Number.isInteger(request.number) || request.number <= 0) throw new Error("Pull request number must be a positive integer");

    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/repos/${encodeURIComponent(request.owner)}/${encodeURIComponent(request.repository)}/pulls/${request.number}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!response.ok) throw new Error(`GitHub pull request lookup failed with HTTP ${response.status}`);

    const payload = (await response.json()) as {
      number?: number;
      state?: string;
      merged?: boolean;
      mergeable?: boolean | null;
    };
    if (!payload.number || !payload.state || typeof payload.merged !== "boolean") {
      throw new Error("GitHub returned an incomplete pull request response");
    }

    return {
      number: payload.number,
      state: payload.state === "open" ? "open" : "closed",
      merged: payload.merged,
      mergeable: payload.mergeable ?? null,
    };
  }
}
