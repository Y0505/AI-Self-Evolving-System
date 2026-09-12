import type { Opportunity } from "../opportunity/opportunity-evaluator.js";
import type { MvpRunResult, MvpRunner } from "./mvp-runner.js";
import type { AutonomousRunOrchestrator } from "../runtime/autonomous-run-orchestrator.js";
import type { AutonomousRunState } from "../runtime/autonomous-run-state-machine.js";

export interface AutonomousMvpRunResult {
  run: MvpRunResult;
  completed: boolean;
  state: AutonomousRunState;
}

export class ControlledAutonomousMvpRunner {
  constructor(
    private readonly mvpRunner: MvpRunner,
    private readonly orchestrator: AutonomousRunOrchestrator,
  ) {}

  async run(opportunities: Opportunity[]): Promise<AutonomousMvpRunResult> {
    try {
      await this.orchestrator.transition("evaluate");
      await this.orchestrator.transition("select_goal");
      await this.orchestrator.transition("research");
      await this.orchestrator.transition("plan");
      await this.orchestrator.transition("build");
      const run = await this.mvpRunner.run(opportunities);

      await this.orchestrator.transition("test");
      await this.orchestrator.transition("observe");
      await this.orchestrator.transition("learn");

      if (run.improvementProposals.length > 0) {
        await this.orchestrator.transition("propose_improvement");
      } else {
        await this.orchestrator.complete("MVP run completed without an improvement proposal.");
      }

      return { run, completed: this.orchestrator.state === "completed", state: this.orchestrator.state };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.orchestrator.fail(message);
      throw error;
    }
  }
}
