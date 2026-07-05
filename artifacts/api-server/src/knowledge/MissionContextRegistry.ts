// RFC-012 Phase 10A: Mission Context Registry
// Single source of workspace context. Enforces boundary.
// Replaces direct searchRepoFiles()/fetchGitHubFile() calls in runtime.

import type { FileIndex } from "./KnowledgeBundle";
import { searchRepoFiles, fetchGitHubFile } from "../ai/tools/tool-adapter";

const WORKSPACE_WHITELIST = ["artifacts/", "src/", "workspace/", ".ai/", "docs/", "lib/"];
const WORKSPACE_BLACKLIST = [".local/", ".cache/", "node_modules/", ".pnpm/", ".git/", "dist/", "build/", "coverage/", "vendor/", "tmp/"];

export class MissionContextRegistry {

  /** Get relevant files for a domain query — workspace-scoped only */
  async getRelevant(domain: string, message: string): Promise<FileIndex[]> {
    const rawPaths = await searchRepoFiles(message);

    // Filter: workspace only
    const filtered = rawPaths
      .filter(p => WORKSPACE_WHITELIST.some(w => p.startsWith(w)))
      .filter(p => !WORKSPACE_BLACKLIST.some(b => p.includes(b)));

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
