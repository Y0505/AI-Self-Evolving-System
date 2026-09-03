export interface DeploymentStatusRequest {
  deploymentId: string;
}

export interface DeploymentStatusResult {
  deploymentId: string;
  environment: string;
  ref: string;
  status: "queued" | "in_progress" | "success" | "failure";
  url: string | null;
}

export interface DeploymentStatusClient {
  get(request: DeploymentStatusRequest): Promise<DeploymentStatusResult>;
}
