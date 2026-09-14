import assert from "node:assert/strict";
import test from "node:test";
import { validateMvpPreflightInput } from "./mvp-preflight.js";

test("accepts HTTPS provider endpoints", () => {
  assert.doesNotThrow(() => validateMvpPreflightInput({
    repositoryRoot: "/tmp/disposable",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.5-flash",
  }));
});

test("accepts local HTTP provider endpoints", () => {
  assert.doesNotThrow(() => validateMvpPreflightInput({
    repositoryRoot: "/tmp/disposable",
    endpoint: "http://127.0.0.1:11434/v1",
    model: "local-model",
  }));
});

test("rejects non-local HTTP endpoints", () => {
  assert.throws(
    () => validateMvpPreflightInput({
      repositoryRoot: "/tmp/disposable",
      endpoint: "http://example.com/v1",
      model: "model",
    }),
    /HTTPS unless it targets localhost/,
  );
});

test("rejects malformed provider endpoints", () => {
  assert.throws(
    () => validateMvpPreflightInput({
      repositoryRoot: "/tmp/disposable",
      endpoint: "not-a-url",
      model: "model",
    }),
    /absolute URL/,
  );
});

test("requires the disposable repository root and model", () => {
  assert.throws(
    () => validateMvpPreflightInput({ repositoryRoot: "", endpoint: "https://example.com", model: "model" }),
    /MVP_REPOSITORY_ROOT is required/,
  );
  assert.throws(
    () => validateMvpPreflightInput({ repositoryRoot: "/tmp/disposable", endpoint: "https://example.com", model: "" }),
    /AI_MODEL is required/,
  );
});
