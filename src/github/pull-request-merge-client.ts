export interface PullRequestMergeRequest {
  owner: string;
  repository: string;
  number: number;
  expectedHeadSha: string;
}

export interface PullRequestMergeResult {
  merged: boolean;
  sha: string;
  message: string;
}

export interface PullRequestMergeClient {
  merge(request: PullRequestMergeRequest): Promise<PullRequestMergeResult>;
}

export interface GitHubPullRequestMergeClientOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class GitHubPullRequestMergeClient implements PullRequestMergeClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubPullRequestMergeClientOptions) {
    if (!options.token.trim()) throw new Error("GitHub token cannot be empty");
    this.token = options.token;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async merge(request: PullRequestMergeRequest): Promise<PullRequestMergeResult> {
    if (!request.owner.trim() || !request.repository.trim()) throw new Error("GitHub owner and repository are required");
    if (!Number.isInteger(request.number) || request.number <= 0) throw new Error("Pull request number must be a positive integer");
    if (!request.expectedHeadSha.trim()) throw new Error("Expected pull request head SHA is required");

    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/repos/${encodeURIComponent(request.owner)}/${encodeURIComponent(request.repository)}/pulls/${request.number}/merge`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ merge_method: "squash", sha: request.expectedHeadSha.trim() }),
      },
    );

    if (!response.ok) throw new Error(`GitHub pull request merge failed with HTTP ${response.status}`);

    const payload = (await response.json()) as { merged?: boolean; sha?: string | null; message?: string };
    if (typeof payload.merged !== "boolean" || typeof payload.message !== "string") {
      throw new Error("GitHub returned an incomplete pull request merge response");
    }
    if (payload.merged && !payload.sha) throw new Error("GitHub returned a merged pull request without a merge SHA");

    return { merged: payload.merged, sha: payload.sha ?? "", message: payload.message };
  }
}
