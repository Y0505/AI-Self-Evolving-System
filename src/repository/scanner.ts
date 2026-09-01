import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

export interface RepositorySnapshot {
  root: string;
  files: number;
  directories: number;
  languages: Record<string, number>;
  testFiles: number;
  configurationFiles: string[];
}

export interface RepositoryScannerOptions {
  ignoredDirectories?: string[];
  ignoredFiles?: string[];
}

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
]);

const DEFAULT_IGNORED_FILES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".json": "JSON",
  ".md": "Markdown",
  ".yml": "YAML",
  ".yaml": "YAML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".html": "HTML",
  ".php": "PHP",
  ".py": "Python",
  ".sql": "SQL",
};

const CONFIGURATION_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".github/workflows/ci.yml",
]);

function isTestFile(path: string): boolean {
  return /(?:\.test|\.spec)\.[^.]+$/.test(path) || /(?:^|[/\\])tests?[/\\]/.test(path);
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export class RepositoryScanner {
  private readonly ignoredDirectories: Set<string>;
  private readonly ignoredFiles: Set<string>;

  constructor(options: RepositoryScannerOptions = {}) {
    this.ignoredDirectories = new Set([
      ...DEFAULT_IGNORED_DIRECTORIES,
      ...(options.ignoredDirectories ?? []),
    ]);
    this.ignoredFiles = new Set([
      ...DEFAULT_IGNORED_FILES,
      ...(options.ignoredFiles ?? []),
    ]);
  }

  async scan(root: string): Promise<RepositorySnapshot> {
    const snapshot: RepositorySnapshot = {
      root,
      files: 0,
      directories: 0,
      languages: {},
      testFiles: 0,
      configurationFiles: [],
    };

    await this.walk(root, root, snapshot);
    snapshot.configurationFiles.sort();
    return snapshot;
  }

  private async walk(
    root: string,
    current: string,
    snapshot: RepositorySnapshot,
  ): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && this.ignoredDirectories.has(entry.name)) {
        continue;
      }
      if (entry.isFile() && this.ignoredFiles.has(entry.name)) {
        continue;
      }

      const absolutePath = join(current, entry.name);
      const relativePath = relative(root, absolutePath).replaceAll("\\", "/");

      if (entry.isDirectory()) {
        snapshot.directories += 1;
        await this.walk(root, absolutePath, snapshot);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      snapshot.files += 1;

      const extension = entry.name.includes(".")
        ? `.${entry.name.split(".").pop()}`.toLowerCase()
        : "";
      const language = LANGUAGE_BY_EXTENSION[extension];
      if (language) {
        increment(snapshot.languages, language);
      }

      if (isTestFile(relativePath)) {
        snapshot.testFiles += 1;
      }

      if (CONFIGURATION_FILES.has(relativePath) || CONFIGURATION_FILES.has(entry.name)) {
        snapshot.configurationFiles.push(relativePath);
      }
    }
  }
}
