export interface PullRequestRequest {
  owner: string;
  repository: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}

export interface PullRequestResult {
  number: number;
  url: string;
  title: string;
  head: string;
  base: string;
}

export interface PullRequestClient {
  create(request: PullRequestRequest): Promise<PullRequestResult>;
}

export interface GitHubPullRequestClientOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class GitHubPullRequestClient implements PullRequestClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubPullRequestClientOptions) {
    if (!options.token.trim()) {
      throw new Error("GitHub token cannot be empty");
    }
    this.token = options.token;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async create(request: PullRequestRequest): Promise<PullRequestResult> {
    if (!request.owner.trim() || !request.repository.trim()) {
      throw new Error("GitHub owner and repository are required");
    }
    if (!request.title.trim()) {
      throw new Error("Pull request title cannot be empty");
    }
    if (!request.head.trim() || !request.base.trim()) {
      throw new Error("Pull request head and base are required");
    }
    if ([request.owner, request.repository, request.head, request.base].some((value) => value.includes("/../") || value.startsWith("../") || value.includes("\\"))) {
      throw new Error("Pull request refs cannot contain path traversal");
    }

    const response = await this.fetchImpl(`${this.apiBaseUrl}/repos/${encodeURIComponent(request.owner)}/${encodeURIComponent(request.repository)}/pulls`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: request.title.trim(),
        body: request.body,
        head: request.head.trim(),
        base: request.base.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub pull request creation failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      number?: number;
      html_url?: string;
      title?: string;
      head?: { ref?: string };
      base?: { ref?: string };
    };

    if (!payload.number || !payload.html_url || !payload.title || !payload.head?.ref || !payload.base?.ref) {
      throw new Error("GitHub returned an incomplete pull request response");
    }

    return {
      number: payload.number,
      url: payload.html_url,
      title: payload.title,
      head: payload.head.ref,
      base: payload.base.ref,
    };
  }
}
