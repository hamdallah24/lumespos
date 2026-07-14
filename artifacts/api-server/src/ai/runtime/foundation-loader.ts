// FoundationLoader — loads KnowledgeAssets from DGPS compiled registry (.ai/registry + .ai/generated/)

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
  metadataRaw: string;
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
        try { metadata[currentKey] = JSON.parse(value); } catch {
          // Handle unquoted YAML tokens: [CEO] → ["CEO"]
          const quoted = value.replace(/([[,]\s*)(\w+)(\s*[\],])/g, '$1"$2"$3');
          try { metadata[currentKey] = JSON.parse(quoted); } catch { metadata[currentKey] = value; }
        }
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
  const registryDir = join(root, "registry");
  const manifestPath = join(registryDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`[FoundationLoader] DGPS registry not found at ${manifestPath}. Run \`dgps publish\` first.`);
  }

  return loadFromRegistry(root, registryDir);
}

/** Load assets from DGPS compiled registry + generated JSON */
function loadFromRegistry(aiRoot: string, registryDir: string): KnowledgeAsset[] {
  const assets: KnowledgeAsset[] = [];
  const registryTypes = ["foundation", "executive", "knowledge", "prompt", "adr"];

  for (const type of registryTypes) {
    const registryPath = join(registryDir, `${type}.json`);
    if (!existsSync(registryPath)) continue;

    const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
    const registryAssets: Record<string, { artifact: string; version: string; checksum: string }> = registry.assets || {};
    const ids = new Set(Object.keys(registryAssets));
    if (ids.size === 0) continue;

    const generatedDir = join(aiRoot, "generated", type);
    if (!existsSync(generatedDir)) continue;

    const generatedFiles = readdirSync(generatedDir).filter(f => f.endsWith(".json"));
    for (const file of generatedFiles) {
      const compiledAsset = JSON.parse(readFileSync(join(generatedDir, file), "utf-8"));
      if (!compiledAsset.id || !ids.has(compiledAsset.id)) continue;

      const meta = compiledAsset.metadata || {};
      assets.push({
        id: compiledAsset.id,
        title: meta.title || compiledAsset.id,
        domain: type,
        artifact_type: compiledAsset.asset_type || type,
        knowledge_level: meta.knowledge_level || "reference",
        context_priority: meta.context_priority || "normal",
        loading_strategy: "always",
        depends_on: Array.isArray(meta.dependencies) ? meta.dependencies : [],
        consumers: Array.isArray(meta.consumer) ? meta.consumer : [],
        stability: meta.stability || "stable",
        version: meta.version || "0.0.0",
        content: compiledAsset.asset_type === "directive"
          ? Object.values(compiledAsset.structure?.prompt || {}).map((l: any) => l.content).filter(Boolean).join("\n\n")
          : (compiledAsset.structure?.body || ""),
        metadataRaw: JSON.stringify(meta),
      });
    }
  }

  return resolveDependencies(assets);
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
