export interface PullRequestReviewsRequest {
  owner: string;
  repository: string;
  number: number;
}

export type PullRequestReviewsStatus = "success" | "failure" | "unknown";

export interface PullRequestReviewsResult {
  number: number;
  status: PullRequestReviewsStatus;
  total: number;
  reviewers: number;
  approved: number;
  changesRequested: number;
  commented: number;
}

export interface PullRequestReviewsClient {
  get(request: PullRequestReviewsRequest): Promise<PullRequestReviewsResult>;
}

export interface GitHubPullRequestReviewsClientOptions {
  token: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

type GitHubReview = {
  user?: { login?: string | null } | null;
  state?: string;
  submitted_at?: string | null;
};

export class GitHubPullRequestReviewsClient implements PullRequestReviewsClient {
  private readonly token: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GitHubPullRequestReviewsClientOptions) {
    if (!options.token.trim()) throw new Error("GitHub token cannot be empty");
    this.token = options.token;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get(request: PullRequestReviewsRequest): Promise<PullRequestReviewsResult> {
    if (!request.owner.trim() || !request.repository.trim()) {
      throw new Error("GitHub owner and repository are required");
    }
    if (!Number.isInteger(request.number) || request.number <= 0) {
      throw new Error("Pull request number must be a positive integer");
    }

    const reviews: GitHubReview[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const url = `${this.apiBaseUrl}/repos/${encodeURIComponent(request.owner)}/${encodeURIComponent(request.repository)}/pulls/${request.number}/reviews?per_page=100&page=${page}`;
      const response = await this.fetchImpl(url, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!response.ok) throw new Error(`GitHub pull request review lookup failed with HTTP ${response.status}`);

      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) throw new Error("GitHub returned an incomplete pull request reviews response");

      reviews.push(...(payload as GitHubReview[]));
      if (payload.length < 100) break;
    }

    const latestByReviewer = new Map<string, GitHubReview>();
    for (const review of reviews) {
      const login = review.user?.login?.trim();
      if (!login || !review.state) continue;

      const previous = latestByReviewer.get(login);
      if (!previous || (review.submitted_at ?? "") >= (previous.submitted_at ?? "")) {
        latestByReviewer.set(login, review);
      }
    }

    let approved = 0;
    let changesRequested = 0;
    let commented = 0;

    for (const review of latestByReviewer.values()) {
      if (review.state === "APPROVED") approved += 1;
      else if (review.state === "CHANGES_REQUESTED") changesRequested += 1;
      else if (review.state === "COMMENTED") commented += 1;
    }

    let status: PullRequestReviewsStatus = "unknown";
    if (changesRequested > 0) status = "failure";
    else if (approved > 0) status = "success";

    return {
      number: request.number,
      status,
      total: reviews.length,
      reviewers: latestByReviewer.size,
      approved,
      changesRequested,
      commented,
    };
  }
}
