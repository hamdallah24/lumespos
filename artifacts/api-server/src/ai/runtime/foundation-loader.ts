// SPRINT 7.1: Foundation Loader — reads .ai/Foundation docs with metadata
// Parses YAML frontmatter, resolves dependencies, builds ordered context

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";

export interface KnowledgeAsset {
  id: string;
  title: string;
  domain: string;
  artifact_type: string;
  knowledge_level: string;
  context_priority: string;
  loading_strategy: string;
  depends_on: string[];
  consumers: string[];
  stability: string;
  version: string;
  content: string;
  metadataRaw: string; // raw YAML for debugging
}

/** Parse YAML frontmatter from markdown — lightweight, no dependency */
function parseMetadata(content: string): { metadata: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: content };
  const yamlBlock = match[1];
  const body = content.slice(match[0].length);

  const metadata: Record<string, any> = {};
  let currentKey = "";
  const lines = yamlBlock.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments and empty lines
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // Check if this is a new key-value pair
    const kvMatch = line.match(/^(\w[\w_]*):\s*(.*)?/);
    if (kvMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
      currentKey = kvMatch[1];
      let value = (kvMatch[2] || "").trim();

      // Empty value → might be a list or block scalar starting on next line
      if (!value) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith("- ")) {
          // List — collect until non-list line
          const listItems: string[] = [];
          while (i + 1 < lines.length && lines[i + 1].trim().startsWith("- ")) {
            i++;
            const item = lines[i].trim().slice(2).trim();
            if (item) listItems.push(item);
          }
          value = JSON.stringify(listItems);
        } else if (nextLine && nextLine.trim().startsWith("|")) {
          // Block scalar — collect indented lines
          i++; // skip the | line
          const blockLines: string[] = [];
          while (i + 1 < lines.length && (lines[i + 1].startsWith("  ") || lines[i + 1].trim() === "")) {
            i++;
            blockLines.push(lines[i].trimStart());
          }
          value = blockLines.join("\n").trim();
        }
      }

      // Clean value
      value = value.replace(/^["']|["']$/g, "").replace(/,\s*$/, "");
      if (value === "[]") metadata[currentKey] = [];
      else if (value === "null" || value === "") metadata[currentKey] = value === "null" ? null : value;
      else if (value.startsWith("[") && value.endsWith("]")) {
        try { metadata[currentKey] = JSON.parse(value); } catch { metadata[currentKey] = value; }
      }
      else metadata[currentKey] = value;
    }
  }

  return { metadata, body };
}

/** Resolve `.ai/` folder path from server root */
function aiFolderPath(): string {
  // Production VPS: /home/ubuntu/lumespos/.ai
  // Local dev: D:\web pos\Point-Of-Sale\.ai
  const cwd = process.cwd();
  if (cwd.includes("api-server")) return resolve(cwd, "..", "..", ".ai");
  return resolve(cwd, ".ai");
}

/** Load all Knowledge Assets from a directory, recursively */
function loadAssetsFromDir(dir: string, domain: string): KnowledgeAsset[] {
  const assets: KnowledgeAsset[] = [];
  if (!existsSync(dir)) return assets;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      assets.push(...loadAssetsFromDir(fullPath, entry.name));
    } else if (entry.name.endsWith(".md") && !entry.name.includes(".deprecated")) {
      try {
        const raw = readFileSync(fullPath, "utf-8");
        const { metadata, body } = parseMetadata(raw);
        if (metadata.id) {
          assets.push({
            id: metadata.id,
            title: metadata.title || entry.name,
            domain: metadata.domain || domain,
            artifact_type: metadata.artifact_type || "unknown",
            knowledge_level: metadata.knowledge_level || "reference",
            context_priority: metadata.context_priority || "normal",
            loading_strategy: metadata.loading_strategy || "on-demand",
            depends_on: Array.isArray(metadata.depends_on) ? metadata.depends_on : [],
            consumers: Array.isArray(metadata.consumers) ? metadata.consumers : [],
            stability: metadata.stability || "unstable",
            version: metadata.version || "0.0.0",
            content: body.trim(),
            metadataRaw: raw.slice(0, 500),
          });
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return assets;
}

/** Topological sort — items with no unmet dependencies come first */
function resolveDependencies(assets: KnowledgeAsset[]): KnowledgeAsset[] {
  const idSet = new Set(assets.map(a => a.id));
  const sorted: KnowledgeAsset[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function visit(asset: KnowledgeAsset) {
    if (inStack.has(asset.id)) return; // circular — skip
    if (visited.has(asset.id)) return;
    inStack.add(asset.id);

    // Visit dependencies first
    for (const depId of (asset.depends_on || [])) {
      if (!idSet.has(depId)) continue; // external dependency, skip
      const dep = assets.find(a => a.id === depId);
      if (dep) visit(dep);
    }

    inStack.delete(asset.id);
    visited.add(asset.id);
    sorted.push(asset);
  }

  // Process highest-priority assets first
  const priorityOrder = { foundational: 0, governing: 1, canonical: 2, operational: 3, reference: 4, experimental: 5, archived: 6 };
  const ordered = [...assets].sort((a, b) =>
    (priorityOrder[a.knowledge_level as keyof typeof priorityOrder] ?? 5) -
    (priorityOrder[b.knowledge_level as keyof typeof priorityOrder] ?? 5)
  );

  for (const asset of ordered) {
    if (!visited.has(asset.id)) visit(asset);
  }

  return sorted;
}

/** Load Foundation documents in dependency-resolved order */
function loadFoundation(): KnowledgeAsset[] {
  const root = aiFolderPath();
  const allAssets: KnowledgeAsset[] = [];

  // Load from foundation/ directory
  const foundationDir = join(root, "foundation");
  allAssets.push(...loadAssetsFromDir(foundationDir, "foundation"));

  // Load root-level Foundation docs (CONSTITUTION, PROJECT_CONTEXT, README)
  const rootAssets = loadAssetsFromDir(root, "foundation");
  for (const a of rootAssets) {
    if (!allAssets.find(existing => existing.id === a.id)) {
      allAssets.push(a);
    }
  }

  // Fallback: explicit load for critical Foundation files that YAML parser might miss
  const criticalRootFiles = ["CONSTITUTION.md", "PROJECT_CONTEXT.md"];
  for (const fileName of criticalRootFiles) {
    const filePath = join(root, fileName);
    if (!existsSync(filePath)) continue;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const { metadata, body } = parseMetadata(raw);
      if (metadata.id && !allAssets.find(a => a.id === metadata.id)) {
        allAssets.push({
          id: metadata.id,
          title: metadata.title || fileName,
          domain: metadata.domain || "foundation",
          artifact_type: metadata.artifact_type || "unknown",
          knowledge_level: metadata.knowledge_level || "governing",
          context_priority: metadata.context_priority || "critical",
          loading_strategy: metadata.loading_strategy || "always",
          depends_on: Array.isArray(metadata.depends_on) ? metadata.depends_on : [],
          consumers: Array.isArray(metadata.consumers) ? metadata.consumers : [],
          stability: metadata.stability || "locked",
          version: metadata.version || "1.0.0",
          content: body.trim(),
          metadataRaw: raw.slice(0, 500),
        });
      }
    } catch { /* skip */ }
  }

  return resolveDependencies(allAssets);
}

/** Build a context string from Foundation docs ready for AI injection */
function buildFoundationContext(
  assets: KnowledgeAsset[],
  mode: "always" | "conditional" | "on-demand" = "always",
  maxTokens = 4000,
): string {
  const filtered = assets.filter(a => {
    if (mode === "always") return a.loading_strategy === "always";
    if (mode === "conditional") return a.loading_strategy === "always" || a.loading_strategy === "conditional";
    return true; // on-demand: include all
  });

  // Token budget: allocate proportionally by context_priority
  const critical = filtered.filter(a => a.context_priority === "critical");
  const high = filtered.filter(a => a.context_priority === "high");
  const normal = filtered.filter(a => a.context_priority !== "critical" && a.context_priority !== "high");

  let budget = maxTokens * 4; // rough char estimate (1 token ≈ 4 chars)
  const sections: string[] = [];

  for (const asset of [...critical, ...high, ...normal]) {
    if (budget <= 0) break;
    const chunk = asset.content.slice(0, budget);
    sections.push(`[ASSET: ${asset.id}] ${asset.title}\n${chunk}\n---`);
    budget -= chunk.length;
  }

  return sections.join("\n\n");
}

// ── Component Metadata ──

export const foundationLoader = {
  name: "FoundationLoader",
  version: "1.0.0",
  capabilities: ["foundation-loading", "metadata-parsing", "dependency-resolution", "context-building"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  /** Load foundation and return ordered assets */
  load: loadFoundation,

  /** Parse metadata from raw markdown string */
  parseMetadata,

  /** Resolve topological order from assets */
  resolveDependencies,

  /** Build AI-ready context string */
  buildContext: buildFoundationContext,

  /** Get all foundation docs as a single string */
  getFoundationPrompt: (maxTokens = 4000) => {
    const assets = loadFoundation();
    return buildFoundationContext(assets, "always", maxTokens);
  },

  /** Load assets by loading_strategy */
  loadByStrategy: (strategy: "always" | "conditional" | "on-demand") => {
    const assets = loadFoundation();
    return assets.filter(a => a.loading_strategy === strategy);
  },
};
