import type { RepositoryWorkspace } from "../repository/workspace.js";
import type { Tool, ToolContext } from "./tool.js";

export interface FileInput {
  path: string;
}

export interface WriteFileInput extends FileInput {
  content: string;
}

export const createReadFileTool = (workspace: RepositoryWorkspace): Tool<FileInput, string> => ({
  name: "read_file",
  description: "Read a UTF-8 file from the repository workspace.",
  execute: ({ path }: FileInput, _context: ToolContext) => workspace.read(path),
});

export const createWriteFileTool = (workspace: RepositoryWorkspace): Tool<WriteFileInput, null> => ({
  name: "write_file",
  description: "Create or replace a UTF-8 file in the repository workspace.",
  async execute({ path, content }: WriteFileInput, _context: ToolContext) {
    await workspace.write(path, content);
    return null;
  },
});

export const createRemoveFileTool = (workspace: RepositoryWorkspace): Tool<FileInput, null> => ({
  name: "remove_file",
  description: "Remove a file or directory from the repository workspace.",
  async execute({ path }: FileInput, _context: ToolContext) {
    await workspace.remove(path);
    return null;
  },
});
