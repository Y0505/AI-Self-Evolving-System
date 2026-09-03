export interface DeploymentRequest {
  environment: string;
  ref: string;
}

export interface DeploymentResult {
  deploymentId: string;
  environment: string;
  ref: string;
  status: "queued" | "in_progress" | "success" | "failure";
  url: string | null;
}

export interface DeploymentClient {
  deploy(request: DeploymentRequest): Promise<DeploymentResult>;
}
