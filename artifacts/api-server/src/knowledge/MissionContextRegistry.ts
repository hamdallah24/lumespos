// RFC-012 Phase 10A: Mission Context Registry
// Single source of workspace context. Enforces boundary.
// Falls back to local filesystem when GitHub API is unavailable.

import type { FileIndex } from "./KnowledgeBundle";
import { searchRepoFiles, fetchGitHubFile } from "../ai/tools/tool-adapter";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const WORKSPACE_WHITELIST = ["artifacts/", "src/", "workspace/", ".ai/", "lib/"];
const WORKSPACE_BLACKLIST = [".local/", ".cache/", "node_modules/", ".pnpm/", ".git/", "dist/", "build/", "coverage/", "vendor/", "tmp/"];

// Find project root same as tool-adapter
const PROJECT_ROOT = (() => {
  let dir = process.cwd().replace(/\\/g, "/");
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return resolve(dir);
    if (existsSync(resolve(dir, "artifacts"))) return resolve(dir);
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
})();

/** Recursively find all files in workspace dirs matching allowed extensions */
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".md", ".yaml", ".yml", ".env.example"]);

function scanLocalFiles(): string[] {
  const results: string[] = [];
  for (const dir of WORKSPACE_WHITELIST) {
    const fullPath = join(PROJECT_ROOT, dir);
    if (!existsSync(fullPath)) continue;
    try {
      const entries = readdirSync(fullPath, { withFileTypes: true, recursive: true });
      for (const e of entries) {
        if (!e.isFile()) continue;
        const ext = e.name.includes(".") ? `.${e.name.split(".").pop()?.toLowerCase()}` : "";
        if (!ALLOWED_EXTENSIONS.has(ext)) continue;
        const relative = join(dir, e.parentPath.replace(fullPath.replace(/\\/g, "/"), "").replace(/\\/g, "/"), e.name).replace(/\\/g, "/").replace(/\/\//g, "/");
        // Filter blacklist
        if (WORKSPACE_BLACKLIST.some(b => relative.includes(b))) continue;
        results.push(relative);
      }
    } catch {}
  }
  return results;
}

function readLocalFile(path: string): string | null {
  const fullPath = join(PROJECT_ROOT, path);
  if (!existsSync(fullPath)) return null;
  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export class MissionContextRegistry {

  /** Get relevant files for a domain query — workspace-scoped only */
  async getRelevant(domain: string, message: string): Promise<FileIndex[]> {
    // First try GitHub API
    const rawPaths = await searchRepoFiles(message);
    let filtered: string[];

    if (rawPaths.length > 0) {
      filtered = rawPaths
        .filter(p => WORKSPACE_WHITELIST.some(w => p.startsWith(w)))
        .filter(p => !WORKSPACE_BLACKLIST.some(b => p.includes(b)));
    } else {
      // Fallback: scan local filesystem
      const allFiles = scanLocalFiles();
      const query = message.toLowerCase();
      filtered = allFiles.filter(p => {
        const lower = p.toLowerCase();
        return query.split(/\s+/).some(q => q.length > 2 && lower.includes(q));
      });
    }

    return filtered.map(p => ({
      path: p,
      name: p.split("/").pop() || p,
      ext: (p.split(".").pop() || "").toLowerCase(),
      directory: p.split("/").slice(0, -1).join("/"),
    })).slice(0, 8);
  }

  /** Get file content for a specific path — with caching */
  private fileCache = new Map<string, { content: string; ts: number }>();

  async getContent(path: string): Promise<string | null> {
    const cached = this.fileCache.get(path);
    if (cached && Date.now() - cached.ts < 300000) {
      return cached.content;
    }

    if (!WORKSPACE_WHITELIST.some(w => path.startsWith(w))) return null;
    if (WORKSPACE_BLACKLIST.some(b => path.includes(b))) return null;

    // Try local filesystem first
    const local = readLocalFile(path);
    if (local !== null) {
      this.fileCache.set(path, { content: local, ts: Date.now() });
      return local;
    }

    // Fallback to GitHub API
    const result = await fetchGitHubFile(path, "main");
    if (result.content) {
      this.fileCache.set(path, { content: result.content, ts: Date.now() });
      return result.content;
    }
    return null;
  }

  /** Search workspace only */
  async search(query: string): Promise<FileIndex[]> {
    return this.getRelevant("general", query);
  }
}

export const missionContextRegistry = new MissionContextRegistry();
