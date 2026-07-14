import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { globSync } from "glob";
import { parseMetadata } from "../utils/yaml.js";
import { fileChecksum } from "../utils/checksum.js";
import { paths } from "../utils/paths.js";
import type { DocumentSource, DocumentCategory } from "../types/index.js";

const CATEGORY_PATTERNS: [RegExp, DocumentCategory][] = [
  [/executives\/CEO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CTO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/COO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CFO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CMO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CAIO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CKO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CHRO\/EXECUTIVE_SPEC/i, "executive-spec"],
  [/executives\/CEO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CTO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/COO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CFO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CMO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CAIO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CKO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CHRO\/PLAYBOOK/i, "executive-playbook"],
  [/executives\/CEO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CTO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/COO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CFO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CMO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CAIO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CKO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/executives\/CHRO\/SYSTEM_PROMPT/i, "executive-prompt"],
  [/CONSTITUTION/i, "constitution"],
  [/knowledge\//i, "knowledge"],
  [/cognition\//i, "cognition"],
  [/prompt\//i, "prompt-framework"],
  [/prompts\//i, "prompt-framework"],
  [/adr\//i, "adr"],
  [/architecture\//i, "adr"],
  [/guides?\//i, "guide"],
  [/epics?\//i, "epic"],
  [/archive\//i, "archive"],
];

function inferCategory(filePath: string): DocumentCategory {
  const normalized = filePath.replace(/\\/g, "/");
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(normalized)) return category;
  }
  return "unknown";
}

/** Auto-generate an ID from file path for legacy docs without frontmatter */
function inferIdFromPath(file: string): string {
  const normalized = file.replace(/\\/g, "/").replace(/\.md$/i, "");
  const parts = normalized.split("/");
  // Take last 2-3 meaningful parts
  const meaningful = parts.filter(p => !["docs", "executive-runtime", "executives"].includes(p));
  return meaningful.join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Extract metadata from inline Markdown fields (legacy format) */
function extractInlineFields(content: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const firstLines = content.split("\n").slice(0, 10).join("\n");
  const roleMatch = firstLines.match(/\*\*Role:\*\*\s*(.+)/i);
  const versionMatch = firstLines.match(/\*\*Version:\*\*\s*(.+)/i);
  const statusMatch = firstLines.match(/\*\*Status:\*\*\s*(.+)/i);
  if (roleMatch) meta.owner = roleMatch[1].trim();
  if (versionMatch) meta.version = versionMatch[1].trim();
  if (statusMatch) meta.status = statusMatch[1].trim();
  return meta;
}

export function scanDocuments(): DocumentSource[] {
  const { docs } = paths();
  if (!existsSync(docs)) {
    console.warn(`[DGPS] docs/ directory not found at: ${docs}`);
    return [];
  }

  const files = globSync("**/*.md", { cwd: docs, nodir: true });
  const sources: DocumentSource[] = [];

  for (const file of files) {
    const fullPath = resolve(docs, file);
    try {
      const raw = readFileSync(fullPath, "utf-8");
      const { metadata, body } = parseMetadata(raw);
      let id = (metadata.id as string) || "";

      // Legacy: files without frontmatter get auto-generated ID from path
      if (!id) {
        id = inferIdFromPath(file);
        const inlineMeta = extractInlineFields(raw);
        // Merge inline metadata with empty frontmatter
        for (const [k, v] of Object.entries(inlineMeta)) {
          if (!metadata[k]) metadata[k] = v;
        }
      }

      const source: DocumentSource = {
        path: fullPath,
        id,
        title: (metadata.title as string) || file.split("/").pop()?.replace(".md", "") || file,
        owner: (metadata.owner as string) || "unknown",
        consumer: arrayField(metadata.consumer),
        version: (metadata.version as string) || "0.0.0",
        checksum: fileChecksum(raw),
        status: (metadata.status as string) || "unknown",
        dependencies: arrayField(metadata.depends_on || metadata.dependencies),
        inherits: arrayField(metadata.inherits),
        category: inferCategory(file),
        content: body || raw,
        metadata,
      };

      sources.push(source);
    } catch (err) {
      console.warn(`[DGPS] Error reading ${file}: ${err}`);
    }
  }

  console.log(`[DGPS] Scanned ${sources.length} documents from docs/`);
  return sources;
}

function arrayField(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}
