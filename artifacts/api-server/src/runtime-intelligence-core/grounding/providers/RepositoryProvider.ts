import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GroundingProvider, RepositoryRequest, FileContent, HealthStatus } from '../../types';

const MAX_FILE_SIZE = 1024 * 1024;
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.eot', '.ttf']);

export class RepositoryProvider implements GroundingProvider<RepositoryRequest, FileContent> {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async read(needs: RepositoryRequest[]): Promise<FileContent[]> {
    if (needs.length === 0) return [];
    const results: FileContent[] = [];
    const triedPaths = new Set<string>();

    for (const need of needs) {
      const pathsToTry = need.suggestedPaths?.map(p => path.join(this.rootDir, p)) ?? [];

      if (pathsToTry.length === 0 && need.description) {
        const guessed = this.guessPath(need.description);
        if (guessed) pathsToTry.push(path.join(this.rootDir, guessed));
      }

      for (const filePath of pathsToTry) {
        const normalized = path.resolve(filePath);
        if (triedPaths.has(normalized)) continue;
        triedPaths.add(normalized);

        const content = this.readFile(normalized);
        if (content !== null) {
          results.push({ path: path.relative(this.rootDir, normalized), content, size: content.length });
          if (need.maxFiles && results.length >= need.maxFiles) break;
        }
      }
    }

    return results;
  }

  async health(): Promise<HealthStatus> {
    try {
      fs.accessSync(this.rootDir, fs.constants.R_OK);
      return { ok: true, latency: 0 };
    } catch {
      return { ok: false, latency: 0 };
    }
  }

  private readFile(filePath: string): string | null {
    try {
      const ext = path.extname(filePath);
      if (BINARY_EXTENSIONS.has(ext)) return null;

      const stat = fs.statSync(filePath);
      if (!stat.isFile() || stat.size > MAX_FILE_SIZE) return null;

      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private guessPath(description: string): string | null {
    const fileMatch = description.match(/([\w/]+\.(?:ts|tsx|js|jsx|json|md))/);
    return fileMatch ? fileMatch[1] : null;
  }
}
