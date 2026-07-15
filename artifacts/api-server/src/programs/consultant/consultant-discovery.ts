// ECP-030: Consultant Discovery — auto-scan project structure
// Uses Node.js fs directly (not tool system) to keep CKO readonly.
// Runs nightly via scheduler, writes cko-file-map.json to data/.

import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve, basename, extname } from "path";

// ROOT = monorepo root (parent of artifacts/), found by walking up from CWD
const ROOT = (() => {
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

const DATA_DIR = join(ROOT, "data");
const FILE_MAP_PATH = join(DATA_DIR, "cko-file-map.json");

interface FileMapEntry {
  files: string[];
  entities: string[];
  domain: string;
  lastVerified: string;
}

interface FileMap {
  [keyword: string]: FileMapEntry;
}

const SCAN_DIRS = [
  "artifacts/pos-app/src/pages",
  "lib/db/src/schema",
  "artifacts/api-server/src/routes",
  "artifacts/api-server/src/ai/programs",
  "artifacts/api-server/src/ai/runtime",
  "artifacts/api-server/src/ai/llm",
  "artifacts/api-server/src/ai/tools",
  "artifacts/api-server/src/programs",
  "artifacts/api-server/src/services",
  "artifacts/api-server/src/middlewares",
  "artifacts/api-server/src/executive-runtime/executives",
  "artifacts/api-server/src/executive-runtime/cognition",
  "artifacts/api-server/src/eios-runtime",
  "artifacts/api-server/src/governance",
  "artifacts/api-server/src/knowledge",
  "artifacts/api-server/src/communication-runtime",
  "artifacts/api-server/src/learning",
  "artifacts/pos-app/src/components",
  ".ai/foundation",
  ".ai/runtime",
  "scripts",
];

const ROOT_CONTEXT_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  ".ai/PROJECT_CONTEXT.md",
  ".ai/README.md",
];

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".md"]);

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  inventory: ["inventory", "stock", "stok", "barang", "warehouse", "gudang"],
  products: ["product", "produk", "catalog", "katalog", "price", "harga", "diskon", "promo"],
  business: ["order", "pesanan", "shift", "dashboard", "laporan", "report", "expense", "biaya", "sales", "penjualan", "checkout", "pembayaran", "hutang"],
  architecture: ["auth", "route", "middleware", "login", "api", "database", "schema", "migration", "server", "migrasi"],
  users: ["user", "pengguna", "profile", "customer", "pelanggan", "karyawan", "staff"],
};

const IGNORE_DIRS = new Set(["node_modules", ".git", ".pnpm", "dist", "build", "coverage", ".cache", ".local", "vendor", "tmp"]);

function scanFiles(dir: string): { path: string; content: string }[] {
  const fullPath = join(ROOT, dir);
  if (!existsSync(fullPath)) return [];
  const results: { path: string; content: string }[] = [];
  try {
    const entries = readdirSync(fullPath, { withFileTypes: true, recursive: true });
    for (const e of entries) {
      if (!e.isFile() || !EXTENSIONS.has(extname(e.name).toLowerCase())) continue;
      // Skip files inside ignored directories (e.g., node_modules)
      const parts = e.parentPath.replace(/\\/g, "/").split("/");
      if (parts.some(p => IGNORE_DIRS.has(p))) continue;
      // Normalize to forward slashes first (Windows has backslashes in parentPath)
      const parentNormalized = e.parentPath.replace(/\\/g, "/");
      const fullNormalized = fullPath.replace(/\\/g, "/");
      const relativeDir = parentNormalized
        .replace(fullNormalized, "")
        .replace(/^\//, "");
      const prelative = relativeDir ? `${dir}/${relativeDir}` : dir;
      try {
        const fileContent = readFileSync(join(e.parentPath, e.name), "utf-8").slice(0, 3000);
        results.push({ path: `${prelative}/${e.name}`, content: fileContent });
      } catch {}
    }
  } catch {}
  return results;
}

function extractKeywords(filename: string, content: string): string[] {
  const keywords: (string | undefined)[] = [];
  const name = basename(filename, extname(filename)).toLowerCase();

  const nameParts = name.split(/[.\-_]/);
  keywords.push(...nameParts.filter(p => p && p.length > 2));

  const importMatch = content.match(/import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g);
  if (importMatch) {
    for (const im of importMatch) {
      const p = im.match(/from\s+['"]([^'"]+)['"]/)?.[1] || "";
      const parts = p.split("/").filter(part => part && part.length > 2 && !part.startsWith(".") && !part.startsWith("@"));
      keywords.push(...parts);
    }
  }

  const compMatch = content.match(/<\w{2,}/g);
  if (compMatch) keywords.push(...compMatch.map(c => c.slice(1).toLowerCase()));

  const routeMatch = content.match(/(?:router|app)\.(?:get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g);
  if (routeMatch) {
    for (const r of routeMatch) {
      const path = r.split(/['"]/)[1];
      if (path) keywords.push(path.split("/").filter(Boolean).join("-"));
    }
  }

  const textWords = content.match(/\b[a-zA-Z]{3,}\b/g) || [];
  keywords.push(...textWords.filter(w => !["this", "that", "with", "from", "into", "your", "have", "will", "about"].includes(w.toLowerCase())));

  return [...new Set(keywords)].filter((k): k is string => !!k && k.length > 2 && k.length < 30);
}

function classifyDomain(filename: string, content: string): string {
  const lower = filename.toLowerCase() + " " + content.slice(0, 1000).toLowerCase();
  let bestDomain = "general";
  let bestScore = 0;

  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const kw of kws) {
      if (lower.includes(kw)) score += 2;
      if (filename.toLowerCase().includes(kw)) score += 5;
    }
    if (score > bestScore) { bestScore = score; bestDomain = domain; }
  }

  return bestDomain;
}

function buildFileMap(): FileMap {
  const map: FileMap = Object.create(null) as FileMap;

  for (const scanDir of SCAN_DIRS) {
    const files = scanFiles(scanDir);
    for (const file of files) {
      const keywords = extractKeywords(file.path, file.content);
      const domain = classifyDomain(file.path, file.content);

      for (const kw of keywords) {
        if (!kw) continue;
        if (!map[kw]) {
          map[kw] = { files: [], entities: [], domain: "general", lastVerified: new Date().toISOString() };
        }
        if (!map[kw].files.includes(file.path)) map[kw].files.push(file.path);
        if (!map[kw].entities.includes(kw)) map[kw].entities.push(kw);
        if (domain !== "general") map[kw].domain = domain;
        map[kw].lastVerified = new Date().toISOString();
      }
    }
  }

  for (const relPath of ROOT_CONTEXT_FILES) {
    const fullPath = join(ROOT, relPath);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, "utf-8").slice(0, 4000);
    const keywords = extractKeywords(relPath, content);
    const domain = classifyDomain(relPath, content);
    for (const kw of keywords) {
      if (!map[kw]) {
        map[kw] = { files: [], entities: [], domain: "general", lastVerified: new Date().toISOString() };
      }
      if (!map[kw].files.includes(relPath)) map[kw].files.push(relPath);
      if (!map[kw].entities.includes(kw)) map[kw].entities.push(kw);
      if (domain !== "general") map[kw].domain = domain;
      map[kw].lastVerified = new Date().toISOString();
    }
  }

  // Manual aliases: ensure common keywords map to same files
  const manualAliases: Record<string, string[]> = {
    inventory: ["stok", "barang", "stock", "gudang"],
    produk: ["product", "katalog", "harga", "diskon", "promo"],
    pesanan: ["order", "checkout", "pembayaran"],
    pengguna: ["user", "customer", "pelanggan", "karyawan", "staff"],
    laporan: ["report", "dashboard"],
    biaya: ["expense", "hutang"],
    auth: ["login", "daftar", "register"],
    migration: ["migrasi", "schema"],
  };

  for (const [primary, aliases] of Object.entries(manualAliases)) {
    if (map[primary]) {
      for (const alias of aliases) {
        if (!map[alias]) {
          map[alias] = { ...map[primary], entities: [alias, ...map[primary].entities.filter(e => e !== alias)] };
        } else {
          for (const f of map[primary].files) {
            if (!map[alias].files.includes(f)) map[alias].files.push(f);
          }
        }
      }
    }
  }

  return map;
}

function loadFileMap(): FileMap | null {
  try {
    if (existsSync(FILE_MAP_PATH)) {
      return JSON.parse(readFileSync(FILE_MAP_PATH, "utf-8"));
    }
  } catch (e: any) {
    console.log(`[CKO] Failed to load file map: ${e.message}`);
  }
  return null;
}

function saveFileMap(map: FileMap): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FILE_MAP_PATH, JSON.stringify(map, null, 2), "utf-8");
    const fileCount = new Set(Object.values(map).flatMap(e => e.files)).size;
    console.log(`[CKO] File map saved: ${Object.keys(map).length} keywords, ${fileCount} files`);
  } catch (e: any) {
    console.log(`[CKO] Failed to save file map: ${e.message}`);
  }
}

function getFileMap(): FileMap {
  return loadFileMap() || buildFileMap();
}

function buildFileIndex(): string {
  const map = getFileMap();
  if (!map) return "";
  // Build reverse index: file path → list of keywords
  const fileToKeywords = new Map<string, string[]>();
  for (const [kw, entry] of Object.entries(map)) {
    for (const f of entry.files) {
      const list = fileToKeywords.get(f) || [];
      if (!list.includes(kw)) list.push(kw);
      fileToKeywords.set(f, list);
    }
  }
  // Format as compact text for LLM
  const lines: string[] = [];
  let idx = 0;
  for (const [file, keywords] of fileToKeywords) {
    if (idx >= 300) break; // limit to 300 files to avoid token overflow
    lines.push(`${idx + 1}. ${file}`);
    lines.push(`   keywords: ${keywords.slice(0, 10).join(", ")}`);
    idx++;
  }
  return lines.join("\n");
}

/** CKO: LLM-based file selection — understands user intent semantically */
export async function findRelevantFiles(query: string, maxResults: number = 5, userId: number = 1): Promise<{ files: string[]; reason: string }> {
  const map = getFileMap();
  if (!map) return { files: [], reason: "File index not available" };

  try {
    const { callDeepSeek } = await import("../../ai/llm/llm-adapter");

    // Phase 1: If user explicitly mentions a file path, prioritize it
    const explicitFiles: string[] = [];
    const filePattern = /([\w\/]+\.\w+)/g;
    let match;
    while ((match = filePattern.exec(query)) !== null) {
      const path = match[1];
      // Check if this path exists in the file map
      for (const entry of Object.values(map)) {
        const files = (entry as any).files || entry as any;
        if (Array.isArray(files) && files.some((f: string) => f.includes(path))) {
          explicitFiles.push(...files.filter((f: string) => f.includes(path)));
        }
      }
    }

    // Phase 2: Extract keywords from query and find matching files
    const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const candidateFiles = new Map<string, { file: string; score: number; keywords: string[] }>();
    const MAX_CANDIDATES = 60;

    for (const [kw, entry] of Object.entries(map)) {
      const files = (entry as any).files || entry as any;
      if (!Array.isArray(files)) continue;
      const kwLower = kw.toLowerCase();
      const kwWords = kwLower.split(/[\s_]+/).filter(w => w.length > 2);

      // Score: how many query words match this keyword
      let score = 0;
      for (const qw of queryWords) {
        if (kwWords.some(kw => kw.includes(qw) || qw.includes(kw))) score++;
        if (kwLower.includes(qw)) score++;
      }
      // Exact match bonus
      if (queryWords.some(qw => qw === kwLower)) score += 3;

      if (score > 0) {
        for (const f of files) {
          const existing = candidateFiles.get(f);
          if (existing) {
            existing.score += score;
            if (!existing.keywords.includes(kw)) existing.keywords.push(kw);
          } else if (candidateFiles.size < MAX_CANDIDATES) {
            candidateFiles.set(f, { file: f, score, keywords: [kw] });
          }
        }
      }
    }

    // Add explicitly mentioned files with high score
    for (const f of explicitFiles) {
      const existing = candidateFiles.get(f);
      if (existing) existing.score += 20;
      else if (candidateFiles.size < MAX_CANDIDATES) {
        candidateFiles.set(f, { file: f, score: 20, keywords: ["explicit"] });
      }
    }

    // Sort by score descending, take top candidates
    const topCandidates = Array.from(candidateFiles.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    if (topCandidates.length === 0) {
      return { files: explicitFiles.slice(0, maxResults), reason: "Menggunakan file yang disebutkan user" };
    }

    // Phase 3: LLM selects from candidates
    const candidateText = topCandidates.map((c, i) =>
      `${i + 1}. ${c.file} (score: ${c.score}, keywords: ${c.keywords.slice(0, 5).join(", ")})`
    ).join("\n");

    const prompt = `Kamu adalah CKO. Pilih file yang PALING RELEVAN untuk perbaikan bug atau fitur yang user minta.

QUERY USER: "${query}"

KANDIDAT FILE (diurutkan berdasarkan skor kecocokan):
${candidateText}

Pilih 1-${maxResults} file. Prioritaskan:
1. File yang user sebutkan secara eksplisit (misal "executive.tsx")
2. File frontend (.tsx, .jsx) untuk masalah UI/UX
3. File dengan skor tertinggi

Output HANYA JSON: {"files":["path1"],"reason":"Penjelasan"}`;

    const result = await callDeepSeek(prompt, "", userId, "bisnis", 500, false);
    const cleaned = result.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      files: Array.isArray(parsed.files) ? parsed.files.slice(0, maxResults) : explicitFiles.slice(0, maxResults),
      reason: parsed.reason || "",
    };
  } catch (e: any) {
    console.log(`[CKO] LLM file selection failed: ${e.message}`);
    if (explicitFiles.length > 0) return { files: explicitFiles.slice(0, maxResults), reason: "Fallback ke file yang disebutkan user" };
    return { files: [], reason: `LLM selection failed: ${e.message}` };
  }
}

export const consultantDiscovery = {
  scan: () => { const map = buildFileMap(); saveFileMap(map); return map; },
  load: loadFileMap,
  get: getFileMap,
  build: buildFileMap,
  save: saveFileMap,
  findRelevantFiles,
};
