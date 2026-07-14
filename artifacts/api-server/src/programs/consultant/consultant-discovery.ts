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

export const consultantDiscovery = {
  scan: () => { const map = buildFileMap(); saveFileMap(map); return map; },
  load: loadFileMap,
  get: getFileMap,
  build: buildFileMap,
  save: saveFileMap,
};
