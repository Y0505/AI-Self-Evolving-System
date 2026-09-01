import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve, dirname } from "node:path";

export interface RepositoryWorkspaceOptions {
  root: string;
}

export class RepositoryWorkspace {
  private readonly root: string;

  constructor(options: RepositoryWorkspaceOptions) {
    this.root = resolve(options.root);
  }

  async read(path: string): Promise<string> {
    return readFile(this.safePath(path), "utf8");
  }

  async write(path: string, content: string): Promise<void> {
    const target = this.safePath(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }

  async remove(path: string): Promise<void> {
    await rm(this.safePath(path), { force: true, recursive: true });
  }

  private safePath(path: string): string {
    if (isAbsolute(path)) {
      throw new Error("Workspace paths must be relative");
    }

    const target = resolve(this.root, path);
    const rel = relative(this.root, target);
    if (rel === ".." || rel.startsWith(`..${pathSeparator()}`)) {
      throw new Error("Path escapes repository workspace");
    }

    return target;
  }
}

function pathSeparator(): string {
  return process.platform === "win32" ? "\\" : "/";
}
