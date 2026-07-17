import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RepositoryMetadata } from '../types';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '__tests__', 'test']);

export class RepositoryMetadataGenerator {
  private cache: Map<string, RepositoryMetadata> = new Map();
  private rootDir: string;
  private initialized = false;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async generate(): Promise<RepositoryMetadata[]> {
    if (this.initialized && this.cache.size > 0) {
      return Array.from(this.cache.values());
    }

    this.cache.clear();
    await this.scanDirectory(this.rootDir);
    this.initialized = true;
    return Array.from(this.cache.values());
  }

  getMetadata(filePath: string): RepositoryMetadata | undefined {
    return this.cache.get(filePath);
  }

  searchByTag(tag: string): RepositoryMetadata[] {
    return Array.from(this.cache.values()).filter(m => m.tags.includes(tag));
  }

  searchByOwner(owner: string): RepositoryMetadata[] {
    return Array.from(this.cache.values()).filter(m => m.owner === owner);
  }

  searchByImportance(importance: 'high' | 'medium' | 'low'): RepositoryMetadata[] {
    return Array.from(this.cache.values()).filter(m => m.importance === importance);
  }

  getAll(): RepositoryMetadata[] {
    return Array.from(this.cache.values());
  }

  clearCache(): void {
    this.cache.clear();
    this.initialized = false;
  }

  private async scanDirectory(dir: string): Promise<void> {
    if (EXCLUDE_DIRS.has(path.basename(dir))) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
        const metadata = this.extractMetadata(fullPath);
        if (metadata) {
          this.cache.set(fullPath, metadata);
        }
      }
    }
  }

  private extractMetadata(filePath: string): RepositoryMetadata | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
      const ext = path.extname(filePath);

      const description = this.extractDescription(content);
      const exportsList = ext === '.json' ? [] : this.extractExports(content);
      const tags = this.inferTags(relativePath, content);
      const owner = this.inferOwner(relativePath);
      const dependencies = ext === '.json' ? this.extractJsonDependencies(content) : this.extractImportDependencies(content);
      const importance = this.calculateImportance(relativePath, exportsList.length, dependencies.length);
      const stat = fs.statSync(filePath);

      return {
        path: relativePath,
        description,
        exports: exportsList,
        tags,
        owner,
        importance,
        dependencies,
        lastModified: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  private extractDescription(content: string): string {
    const fileComment = content.match(/^\/\/\s*(.+?)(?:\n|$)/);
    if (fileComment) return fileComment[1].trim();

    const jsDoc = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)(?:\n|$)/);
    if (jsDoc) return jsDoc[1].trim();

    const firstExport = content.match(/export\s+(?:default\s+)?(?:class|function|const|interface|type)\s+(\w+)/);
    if (firstExport) return `Module: ${firstExport[1]}`;

    return path.basename(content.slice(0, 200));
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|interface|type|enum|abstract\s+class)\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    const namedRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    while ((match = namedRegex.exec(content)) !== null) {
      match[1].split(',').forEach(n => {
        const trimmed = n.trim().split(/\s+as\s+/)[0].trim();
        if (trimmed && !exports.includes(trimmed)) {
          exports.push(trimmed);
        }
      });
    }

    return exports;
  }

  private inferTags(relativePath: string, content: string): string[] {
    const tags: string[] = [];
    const segments = relativePath.replace(/\\/g, '/').split('/');

    segments.forEach(s => {
      if (s && !s.includes('.')) {
        tags.push(s.toLowerCase());
      }
    });

    const keywordPatterns: [RegExp, string][] = [
      [/\bexecutive\b/i, 'executive'],
      [/\bintelligence\b/i, 'intelligence'],
      [/\bdomain\b/i, 'domain'],
      [/\bplanning\b/i, 'planning'],
      [/\bgrounding\b/i, 'grounding'],
      [/\bverification\b/i, 'verification'],
      [/\btool\b/i, 'tool'],
      [/\bmemory\b/i, 'memory'],
      [/\bmetadata\b/i, 'metadata'],
      [/\bapi\b/i, 'api'],
      [/\bmiddleware\b/i, 'middleware'],
      [/\bmodel\b/i, 'model'],
      [/\butility\b/i, 'utility'],
      [/\bconfig\b/i, 'config'],
    ];

    for (const [pattern, tag] of keywordPatterns) {
      if (pattern.test(content) && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private inferOwner(relativePath: string): string {
    const segments = relativePath.replace(/\\/g, '/').split('/');
    if (segments[0] === 'executives' && segments[1]) return segments[1].replace('.ts', '');
    if (segments[0] === 'runtime-intelligence' || segments[0] === 'runtime-intelligence-core') return 'ric';
    if (segments[0] === 'application') return 'application';
    if (segments[0] === 'infrastructure') return 'infrastructure';
    if (segments[0] === 'domain') return 'domain';
    return 'unknown';
  }

  private extractImportDependencies(content: string): string[] {
    const deps: string[] = [];
    const importRegex = /from\s+['"](.+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      if (dep.startsWith('.') || dep.startsWith('/')) continue;
      const packageName = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : dep.split('/')[0];
      if (!deps.includes(packageName)) {
        deps.push(packageName);
      }
    }
    return deps;
  }

  private extractJsonDependencies(content: string): string[] {
    try {
      const json = JSON.parse(content);
      const deps: string[] = [];
      if (json.dependencies) deps.push(...Object.keys(json.dependencies));
      if (json.devDependencies) deps.push(...Object.keys(json.devDependencies));
      return deps;
    } catch {
      return [];
    }
  }

  private calculateImportance(
    relativePath: string,
    exportCount: number,
    dependencyCount: number,
  ): 'high' | 'medium' | 'low' {
    const isCore = /\b(core|main|index|RuntimeIntelligenceCore|types)\b/i.test(relativePath);
    const isExecutive = relativePath.startsWith('executives');
    const isEntryPoint = path.basename(relativePath) === 'index.ts';

    if (isCore || isExecutive) return 'high';
    if (isEntryPoint || exportCount > 3 || dependencyCount > 5) return 'high';
    if (exportCount > 0 || dependencyCount > 2) return 'medium';
    return 'low';
  }
}
