export interface ToolApprovalRequest {
  tool: string;
  input: unknown;
}

export interface ToolApprovalService {
  requestApproval(request: ToolApprovalRequest): Promise<boolean>;
}
