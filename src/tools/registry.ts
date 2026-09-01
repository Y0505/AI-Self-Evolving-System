import type { Tool } from "./tool.js";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown, unknown>>();

  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool as Tool<unknown, unknown>);
  }

  get(name: string): Tool<unknown, unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool;
  }

  list(): string[] {
    return [...this.tools.keys()];
  }
}
