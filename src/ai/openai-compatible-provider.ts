import type { AIRequest, AIResponse, AIProvider } from "./provider.js";

export interface OpenAICompatibleProviderOptions {
  endpoint: string;
  model: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const response = await this.fetch(`${this.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(request),
          },
          {
            role: "user",
            content: request.task.description,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error("AI provider returned no message content");
    }

    return {
      content,
      provider: "openai-compatible",
      model: this.model,
    };
  }
}

function buildSystemPrompt(request: AIRequest): string {
  return [
    "You are an agent operating on a software repository.",
    `Repository root: ${request.repository.root}`,
    `Repository files: ${request.repository.files}`,
    `Repository directories: ${request.repository.directories}`,
    `Repository languages: ${JSON.stringify(request.repository.languages)}`,
    `Test files: ${request.repository.testFiles}`,
    `Configuration files: ${JSON.stringify(request.repository.configurationFiles)}`,
    request.instructions,
  ]
    .filter(Boolean)
    .join("\n");
}
