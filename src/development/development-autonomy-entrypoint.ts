import { resolve } from "node:path";
import { RoadmapWorkspace } from "./roadmap-workspace.js";
import { DevelopmentAutonomyRunner, type DevelopmentAutonomyResult, type DevelopmentImplementationBoundary, type DevelopmentTestBoundary, type DevelopmentDiagnosisBoundary, type DevelopmentGitBoundary, type DevelopmentCiBoundary, type DevelopmentObservation } from "./development-autonomy-runner.js";

export interface DevelopmentAutonomyEntrypointOptions {
  repositoryRoot: string;
  implementation: DevelopmentImplementationBoundary;
  tests: DevelopmentTestBoundary;
  diagnosis: DevelopmentDiagnosisBoundary;
  git: DevelopmentGitBoundary;
  ci: DevelopmentCiBoundary;
  maxTasks?: number;
  maxFixAttemptsPerTask?: number;
  onObservation?: (observation: DevelopmentObservation) => void;
}

/**
 * Application entrypoint for the autonomous development loop.
 *
 * All side effects remain behind explicit boundaries. This module only wires
 * the deterministic roadmap observer to the controlled runner; it does not
 * grant merge, deployment, spending, or outreach authority.
 */
export async function runDevelopmentAutonomy(
  options: DevelopmentAutonomyEntrypointOptions,
): Promise<DevelopmentAutonomyResult> {
  const workspace = new RoadmapWorkspace(resolve(options.repositoryRoot, "PROJECT_ROADMAP.md"));
  const runner = new DevelopmentAutonomyRunner(
    workspace,
    options.implementation,
    options.tests,
    options.diagnosis,
    options.git,
    options.ci,
    {
      maxTasks: options.maxTasks,
      maxFixAttemptsPerTask: options.maxFixAttemptsPerTask,
      onObservation: options.onObservation,
    },
  );

  return runner.run();
}
