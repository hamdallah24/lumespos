// ECP-022.5: Foundation Registry Generator — build-time artifact
// Scans .ai/foundation/*.md, validates metadata, generates:
//   1. FOUNDATION_REGISTRY.md (canonical registry)
//   2. foundation-fingerprint.json (SHA-256 hash of metadata structure)
// Run: npx ts-node scripts/generate-foundation-registry.ts

import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";

const PROJECT_ROOT = process.cwd().includes("scripts") ? resolve(process.cwd(), "..") : process.cwd();
const FOUNDATION_DIR = join(PROJECT_ROOT, ".ai", "foundation");
const REGISTRY_OUTPUT = join(FOUNDATION_DIR, "FOUNDATION_REGISTRY.md");
const FINGERPRINT_OUTPUT = join(PROJECT_ROOT, "artifacts", "api-server", "foundation-fingerprint.json");

interface DocMeta {
  id: string;
  title: string;
  domain: string;
  artifact_type: string;
  owner: string;
  version: string;
  stability: string;
  lifecycle: string;
  knowledge_level: string;
  loading_strategy: string;
  last_updated: string;
  depends_on: string[];
  compatible_with: Record<string, string>;
  authorized_consumers: string[];
  [key: string]: unknown;
}

interface ValidationError {
  doc: string;
  field: string;
  message: string;
  severity: "BLOCK" | "WARN";
}

const VALID_STABILITY = ["draft", "stable", "locked", "sealed", "immutable", "deprecated", "archived"];
const VALID_LIFECYCLE = ["DRAFT", "CANDIDATE", "ACTIVE", "LOCKED", "DEPRECATED", "ARCHIVED"];
const VALID_KNOWLEDGE = ["foundational", "governing", "canonical", "operational", "reference"];
const VALID_LOADING = ["always", "conditional", "on-demand"];
const VALID_TYPES = ["constitution", "covenant", "philosophy", "architecture", "directive", "capability", "standard", "registry", "index", "manifesto", "model", "policy", "contract", "vision"];
const VALID_LIFECYCLE_STABILITY: Record<string, string[]> = {
  DRAFT: ["draft"],
  CANDIDATE: ["draft", "stable"],
  ACTIVE: ["stable", "locked"],
  LOCKED: ["locked", "sealed", "immutable"],
  DEPRECATED: ["deprecated"],
  ARCHIVED: ["archived"],
};

function parseMetadata(content: string): { metadata: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: content };
  const yamlBlock = match[1];
  const body = content.slice(match[0].length);
  const metadata: Record<string, unknown> = {};
  let currentKey = "";
  const lines = yamlBlock.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kvMatch = line.match(/^(\w[\w_]*):\s*(.*)?/);
    if (kvMatch && !line.startsWith(" ") && !line.startsWith("\t")) {
      currentKey = kvMatch[1];
      let value = (kvMatch[2] || "").trim();
      if (!value) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith("- ")) {
          const listItems: string[] = [];
          while (i + 1 < lines.length && lines[i + 1].trim().startsWith("- ")) {
            i++;
            const item = lines[i].trim().slice(2).trim();
            if (item) listItems.push(item);
          }
          value = JSON.stringify(listItems);
        } else if (nextLine && nextLine.trim().startsWith("|")) {
          i++;
          const blockLines: string[] = [];
          while (i + 1 < lines.length && (lines[i + 1].startsWith("  ") || lines[i + 1].trim() === "")) {
            i++;
            blockLines.push(lines[i].trimStart());
          }
          value = blockLines.join("\n").trim();
        }
      }
      value = value.replace(/^["']|["']$/g, "").replace(/,\s*$/, "");
      if (value.startsWith("[") && value.endsWith("]")) {
        try { metadata[currentKey] = JSON.parse(value); }
        catch { metadata[currentKey] = value; }
      } else if (value === "null") {
        metadata[currentKey] = null;
      } else {
        metadata[currentKey] = value;
      }
    }
  }
  return { metadata, body };
}

function parseCompatibleWith(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        const [k, v] = item.split(": ");
        if (k && v) result[k] = v;
      }
    }
  } else {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string") result[k] = v;
    }
  }
  return result;
}

function validate(doc: string, meta: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];
  const e = (field: string, msg: string, sev: "BLOCK" | "WARN" = "BLOCK") =>
    errors.push({ doc, field, message: msg, severity: sev });

  const id = String(meta.id || "");
  if (!/^[a-z][a-z0-9-]+-v\d+$/.test(id)) e("id", `Invalid ID format: "${id}"`);
  if (!meta.title) e("title", "Missing title");
  if (meta.domain !== "foundation") e("domain", `Domain must be "foundation", got "${meta.domain}"`);
  if (!VALID_TYPES.includes(String(meta.artifact_type || ""))) e("artifact_type", `Invalid type: "${meta.artifact_type}"`);
  if (!meta.owner) e("owner", "Missing owner");
  if (!/^\d+\.\d+\.\d+$/.test(String(meta.version || ""))) e("version", `Invalid semver: "${meta.version}"`);
  if (!VALID_STABILITY.includes(String(meta.stability || ""))) e("stability", `Invalid stability: "${meta.stability}"`);
  if (!VALID_LIFECYCLE.includes(String(meta.lifecycle || ""))) e("lifecycle", `Invalid lifecycle: "${meta.lifecycle}"`);
  if (!VALID_KNOWLEDGE.includes(String(meta.knowledge_level || ""))) e("knowledge_level", `Invalid knowledge level: "${meta.knowledge_level}"`);
  if (!VALID_LOADING.includes(String(meta.loading_strategy || ""))) e("loading_strategy", `Invalid loading strategy: "${meta.loading_strategy}"`);
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(meta.last_updated || ""))) e("last_updated", `Invalid date: "${meta.last_updated}"`, "WARN");

  const lifecycle = String(meta.lifecycle || "");
  const stability = String(meta.stability || "");
  const allowed = VALID_LIFECYCLE_STABILITY[lifecycle] || [];
  if (lifecycle && stability && !allowed.includes(stability)) {
    e("lifecycle/stability", `${lifecycle} cannot have stability "${stability}". Allowed: ${allowed.join(", ")}`);
  }
  return errors;
}

function checkCircularDeps(docs: DocMeta[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const idSet = new Set(docs.map(d => d.id));

  for (const doc of docs) {
    for (const depId of doc.depends_on) {
      // Only block on Foundation document IDs (matching ID pattern)
      const isFoundationId = depId.match(/^[a-z][a-z0-9-]+-v\d+$/);
      const existsInFoundation = idSet.has(depId);
      if (!existsInFoundation && isFoundationId) {
        errors.push({ doc: doc.id, field: "depends_on", message: `Missing dependency: ${depId} (referenced but not in .ai/foundation/)`, severity: "WARN" });
      }
    }

    const visited = new Set<string>();
    const stack = [doc.id];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const currentDoc = docs.find(d => d.id === current);
      if (!currentDoc) continue;
      for (const depId of currentDoc.depends_on) {
        if (depId === doc.id) {
          errors.push({ doc: doc.id, field: "depends_on", message: `Circular dependency: ${doc.id} → ... → ${doc.id}`, severity: "BLOCK" });
          break;
        }
        if (idSet.has(depId)) stack.push(depId);
      }
    }
  }
  return errors;
}

function checkCompatibleWith(docs: DocMeta[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const versionMap = new Map(docs.map(d => [d.id, d.version]));

  for (const doc of docs) {
    for (const [targetId, range] of Object.entries(doc.compatible_with)) {
      const targetVer = versionMap.get(targetId);
      if (!targetVer) {
        errors.push({ doc: doc.id, field: "compatible_with", message: `Target document not found: ${targetId}`, severity: "BLOCK" });
        continue;
      }
      const [tmaj, tmin] = targetVer.split(".").map(Number);
      if (range.startsWith("^")) {
        const [rmaj] = range.slice(1).split(".").map(Number);
        if (rmaj !== tmaj) {
          errors.push({ doc: doc.id, field: "compatible_with", message: `${targetId} v${targetVer} not compatible with range ${range}`, severity: "BLOCK" });
        }
      }
    }
  }
  return errors;
}

function formatRegistry(docs: DocMeta[], generatedAt: string): string {
  const lines: string[] = [
    "# Foundation Canonical Registry",
    "",
    `Generated: ${generatedAt}`,
    `Source: metadata from ${docs.length} documents in .ai/foundation/`,
    "",
    "## Active Documents",
    "",
    "| ID | Title | Type | Lifecycle | Stability | Knowledge | Loading | Version | Deps |",
    "|----|-------|------|-----------|-----------|----------|---------|---------|------|",
  ];

  const active = docs.filter(d => !["ARCHIVED"].includes(d.lifecycle));
  const archived = docs.filter(d => d.lifecycle === "ARCHIVED");

  for (const d of active) {
    lines.push(`| ${d.id} | ${d.title} | ${d.artifact_type} | ${d.lifecycle} | ${d.stability} | ${d.knowledge_level} | ${d.loading_strategy} | ${d.version} | ${d.depends_on.length} |`);
  }

  if (archived.length > 0) {
    lines.push("", "## Tombstone (Archived)", "", "| ID | Title | Type | Archived | Deps |", "|----|-------|------|----------|------|");
    for (const d of archived) {
      lines.push(`| ${d.id} | ${d.title} | ${d.artifact_type} | ${d.lifecycle} | ${d.depends_on.length} |`);
    }
  }

  lines.push("", "## Capability Matrix", "");
  const allConsumers = new Set<string>();
  for (const d of docs) { d.authorized_consumers.forEach(c => allConsumers.add(c)); }
  const consumers = [...allConsumers].sort();
  lines.push(`| Document | ${consumers.join(" | ")} |`);
  lines.push(`|----------|${consumers.map(() => "------").join("|")}|`);

  for (const d of docs) {
    const checks = consumers.map(c => d.authorized_consumers.includes(c) ? "✅" : "❌");
    lines.push(`| ${d.id} | ${checks.join(" | ")} |`);
  }

  return lines.join("\n") + "\n";
}

function generateFingerprint(docs: DocMeta[], generatedAt: string): string {
  const structure = {
    document_count: docs.length,
    documents: docs.map(d => ({
      id: d.id,
      lifecycle: d.lifecycle,
      stability: d.stability,
      version: d.version,
      depends_on: d.depends_on.sort(),
    })).sort((a, b) => a.id.localeCompare(b.id)),
    generated_at: generatedAt,
  };
  const fingerprint = createHash("sha256").update(JSON.stringify(structure)).digest("hex").slice(0, 16);

  return JSON.stringify({
    fingerprint,
    generated_at: generatedAt,
    document_count: docs.length,
    id_list: docs.map(d => d.id).sort(),
  }, null, 2);
}

function main(): void {
  if (!existsSync(FOUNDATION_DIR)) {
    console.error(`[Registry] Foundation directory not found: ${FOUNDATION_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(FOUNDATION_DIR).filter(f => f.endsWith(".md"));
  const docs: DocMeta[] = [];
  const allErrors: ValidationError[] = [];
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  for (const file of files) {
    const content = readFileSync(join(FOUNDATION_DIR, file), "utf-8");
    const { metadata } = parseMetadata(content);
    if (!metadata.id) {
      allErrors.push({ doc: file, field: "id", message: "Missing ID — cannot process", severity: "BLOCK" });
      continue;
    }

    const meta: DocMeta = {
      id: String(metadata.id || ""),
      title: String(metadata.title || ""),
      domain: String(metadata.domain || "foundation"),
      artifact_type: String(metadata.artifact_type || ""),
      owner: String(metadata.owner || ""),
      version: String(metadata.version || "0.0.0"),
      stability: String(metadata.stability || "stable"),
      lifecycle: String(metadata.lifecycle || "ACTIVE"),
      knowledge_level: String(metadata.knowledge_level || "reference"),
      loading_strategy: String(metadata.loading_strategy || "on-demand"),
      last_updated: String(metadata.last_updated || ""),
      depends_on: Array.isArray(metadata.depends_on) ? metadata.depends_on as string[] : [],
      compatible_with: parseCompatibleWith(metadata.compatible_with),
      authorized_consumers: Array.isArray(metadata.authorized_consumers)
        ? metadata.authorized_consumers as string[]
        : Array.isArray(metadata.consumers) ? metadata.consumers as string[] : [],
    };

    const errors = validate(meta.id, metadata);
    allErrors.push(...errors);
    docs.push(meta);
  }

  allErrors.push(...checkCircularDeps(docs));
  allErrors.push(...checkCompatibleWith(docs));

  const blockErrors = allErrors.filter(e => e.severity === "BLOCK");
  const warnErrors = allErrors.filter(e => e.severity === "WARN");

  if (warnErrors.length > 0) {
    console.log(`[Registry] ${warnErrors.length} WARNINGS:`);
    warnErrors.forEach(e => console.log(`  ⚠️  ${e.doc}: ${e.field} — ${e.message}`));
  }

  if (blockErrors.length > 0) {
    console.error(`[Registry] ${blockErrors.length} BLOCKING ERRORS:`);
    blockErrors.forEach(e => console.error(`  ❌ ${e.doc}: ${e.field} — ${e.message}`));
    console.error(`\nBuild FAILED. Fix ${blockErrors.length} errors above.`);
    process.exit(1);
  }

  const registry = formatRegistry(docs, generatedAt);
  writeFileSync(REGISTRY_OUTPUT, registry);
  console.log(`[Registry] Generated FOUNDATION_REGISTRY.md (${docs.length} documents)`);

  const fingerprint = generateFingerprint(docs, generatedAt);
  writeFileSync(FINGERPRINT_OUTPUT, fingerprint);
  console.log(`[Fingerprint] Generated foundation-fingerprint.json`);

  console.log(`[Registry] ✅ Validation passed. ${docs.length} documents. 0 BLOCKING errors.`);
}

main();
