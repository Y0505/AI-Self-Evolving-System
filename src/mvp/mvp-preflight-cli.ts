import { runMvpPreflight } from "./mvp-preflight.js";

async function main(): Promise<void> {
  if (process.env.MVP_DISPOSABLE !== "1") {
    throw new Error("Refusing to run: set MVP_DISPOSABLE=1 to explicitly opt into disposable-repository validation.");
  }

  const result = await runMvpPreflight({
    repositoryRoot: process.env.MVP_REPOSITORY_ROOT ?? "",
    endpoint: process.env.AI_API_ENDPOINT ?? "",
    model: process.env.AI_MODEL ?? "",
    apiKey: process.env.AI_API_KEY,
  });

  console.log(JSON.stringify({
    ok: true,
    ...result,
    apiKeyConfigured: result.apiKeyConfigured,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
