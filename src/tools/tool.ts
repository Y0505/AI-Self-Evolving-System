export interface ToolContext {
  workspaceRoot: string;
}

export interface Tool<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
