export interface ExecutionBudgetLimits {
  maxTasks: number;
  maxToolCalls: number;
  maxRetries: number;
  maxIterations: number;
}

export type ExecutionBudgetMetric = keyof ExecutionBudgetLimits;

export interface ExecutionBudgetSnapshot {
  tasks: number;
  toolCalls: number;
  retries: number;
  iterations: number;
}

export class ExecutionBudgetExceededError extends Error {
  constructor(
    public readonly metric: ExecutionBudgetMetric,
    public readonly limit: number,
  ) {
    super(`Execution budget exceeded for ${metric}: limit ${limit}`);
    this.name = "ExecutionBudgetExceededError";
  }
}

const metricToLimit: Record<ExecutionBudgetMetric, keyof ExecutionBudgetLimits> = {
  tasks: "maxTasks",
  toolCalls: "maxToolCalls",
  retries: "maxRetries",
  iterations: "maxIterations",
};

export class DeterministicExecutionBudget {
  private readonly counts: ExecutionBudgetSnapshot = {
    tasks: 0,
    toolCalls: 0,
    retries: 0,
    iterations: 0,
  };

  constructor(private readonly limits: ExecutionBudgetLimits) {
    for (const [key, value] of Object.entries(limits)) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Execution budget ${key} must be a non-negative integer.`);
      }
    }
  }

  consume(metric: ExecutionBudgetMetric, amount = 1): void {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Execution budget consumption must be a positive integer.");
    }

    const next = this.counts[metric] + amount;
    const limit = this.limits[metricToLimit[metric]];
    if (next > limit) {
      throw new ExecutionBudgetExceededError(metric, limit);
    }

    this.counts[metric] = next;
  }

  remaining(metric: ExecutionBudgetMetric): number {
    return this.limits[metricToLimit[metric]] - this.counts[metric];
  }

  snapshot(): ExecutionBudgetSnapshot {
    return { ...this.counts };
  }
}
