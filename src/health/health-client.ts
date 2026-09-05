export interface HealthCheckRequest {
  url: string;
}

export interface HealthCheckResult {
  url: string;
  status: "healthy" | "unhealthy" | "unknown";
  statusCode: number | null;
  latencyMs: number | null;
}

export interface HealthClient {
  check(request: HealthCheckRequest): Promise<HealthCheckResult>;
}
