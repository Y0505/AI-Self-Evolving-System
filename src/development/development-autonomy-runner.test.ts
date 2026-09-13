import { describe, expect, it } from "node:test";
import { DevelopmentAutonomyRunner, type DevelopmentTask } from "./development-autonomy-runner.js";

const task: DevelopmentTask = { id: "roadmap-1", title: "First incomplete milestone", source: "roadmap" };

function createRunner(overrides: {
  testResults?: boolean[];
  diagnosis?: "fix" | "blocked";
  ci?: "passed" | "failed" | "pending";
} = {}) {
  const calls: string[] = [];
  let testIndex = 0;
  const runner = new DevelopmentAutonomyRunner(
    { inspect: async () => ({ tasks: [task] }) },
    { implement: async () => calls.push("implement") },
    {
      run: async () => {
        calls.push("test");
        const result = overrides.testResults?.[testIndex] ?? true;
        testIndex += 1;
        return { passed: result, output: result ? "ok" : "failure" };
      },
    },
    { diagnose: async () => { calls.push("diagnose"); return overrides.diagnosis ?? "fix"; } },
    {
      prepare: async () => calls.push("prepare"),
      commit: async () => calls.push("commit"),
      createPullRequest: async () => calls.push("pr"),
    },
    { waitForChecks: async () => { calls.push("ci"); return overrides.ci ?? "passed"; } },
  );
  return { runner, calls };
}

describe("DevelopmentAutonomyRunner", () => {
  it("advances through branch preparation, implementation, PR and CI, then stops at human review", async () => {
    const { runner, calls } = createRunner();
    const result = await runner.run();

    expect(result.state).toBe("ready_for_review");
    expect(result.completedTaskIds).toEqual([task.id]);
    expect(calls).toEqual(["prepare", "implement", "test", "commit", "pr", "ci"]);
  });

  it("diagnoses and fixes a failed test without implicit infinite retries", async () => {
    const { runner, calls } = createRunner({ testResults: [false, true] });
    const result = await runner.run();

    expect(result.state).toBe("ready_for_review");
    expect(calls).toEqual(["prepare", "implement", "test", "diagnose", "implement", "test", "commit", "pr", "ci"]);
  });

  it("stops when diagnosis requires human intervention", async () => {
    const { runner, calls } = createRunner({ testResults: [false], diagnosis: "blocked" });
    const result = await runner.run();

    expect(result.state).toBe("blocked");
    expect(result.blockedTaskId).toBe(task.id);
    expect(calls).toEqual(["prepare", "implement", "test", "diagnose"]);
  });

  it("stops on failed or pending CI and never crosses the merge gate", async () => {
    for (const ci of ["failed", "pending"] as const) {
      const { runner, calls } = createRunner({ ci });
      const result = await runner.run();

      expect(result.state).toBe("blocked");
      expect(result.blockedTaskId).toBe(task.id);
      expect(calls).toEqual(["prepare", "implement", "test", "commit", "pr", "ci"]);
    }
  });

  it("completes cleanly when there is no roadmap work", async () => {
    const runner = new DevelopmentAutonomyRunner(
      { inspect: async () => ({ tasks: [] }) },
      { implement: async () => { throw new Error("must not implement"); } },
      { run: async () => ({ passed: true, output: "" }) },
      { diagnose: async () => "blocked" },
      { prepare: async () => { throw new Error("must not prepare"); }, commit: async () => { throw new Error("must not commit"); }, createPullRequest: async () => { throw new Error("must not create PR"); } },
      { waitForChecks: async () => "passed" },
    );

    const result = await runner.run();
    expect(result.state).toBe("completed");
    expect(result.completedTaskIds).toEqual([]);
  });
});
