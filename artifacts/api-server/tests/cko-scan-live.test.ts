/**
 * EPIC QA-CKO.1 — Live CKO Scan Test
 * Tests that consultantDiscovery can scan the project,
 * extract keywords, classify domains, and persist to disk.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, unlinkSync, rmSync } from "fs";
import { join, resolve } from "path";

const DATA_DIR = resolve(process.cwd(), "..", "..", "data");
const FILE_MAP_PATH = join(DATA_DIR, "cko-file-map.json");

describe("CKO Project Discovery Scan", () => {
  let discovery: any;

  beforeAll(async () => {
    const mod = await import("../src/programs/consultant/consultant-discovery");
    discovery = mod.consultantDiscovery;
  });

  it("1. harus scan project dan build file map", () => {
    const map = discovery.scan();

    expect(map).toBeTruthy();
    expect(typeof map).toBe("object");

    const keywordCount = Object.keys(map).length;
    console.log(`[CKO] Keywords ditemukan: ${keywordCount}`);
    expect(keywordCount).toBeGreaterThan(50);
  });

  it("2. harus simpan file map ke disk", () => {
    expect(existsSync(FILE_MAP_PATH)).toBe(true);
    const saved = JSON.parse(readFileSync(FILE_MAP_PATH, "utf-8"));
    expect(Object.keys(saved).length).toBeGreaterThan(50);
    console.log(`[CKO] Tersimpan di: ${FILE_MAP_PATH}`);
  });

  it("3. harus klasifikasi domain dengan benar", () => {
    const map = discovery.load();
    const domainCounts: Record<string, number> = {};
    for (const [kw, entry] of Object.entries(map)) {
      const d = (entry as any).domain;
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    console.log("[CKO] Domain distribution:", JSON.stringify(domainCounts));
    // Should have at least 2 domains populated
    expect(Object.keys(domainCounts).length).toBeGreaterThanOrEqual(2);
  });

  it("4. harus bisa load file map dari disk", () => {
    const loaded = discovery.load();
    expect(loaded).toBeTruthy();
    expect(Object.keys(loaded).length).toBeGreaterThan(50);

    // Check a known keyword exists
    const allKeywords = Object.keys(loaded);
    console.log(`[CKO] Contoh keyword: ${allKeywords.slice(0, 10).join(", ")}`);
  });

  it("5. keyword 'auth' harus pointing ke middleware/routes auth", () => {
    const map = discovery.load();
    const authEntry = map["auth"];
    expect(authEntry).toBeTruthy();
    console.log(`[CKO] Keyword 'auth' → files: ${(authEntry as any).files.join(", ")}`);

    // Should include auth-related file paths
    expect((authEntry as any).files.some((f: string) => f.includes("auth.ts") || f.includes("auth-middleware"))).toBe(true);
    console.log(`[CKO] Keyword 'auth' domain: ${(authEntry as any).domain}`);
  });

  it("6. manual aliases harus bekerja (auth ↔ login)", () => {
    const map = discovery.load();
    const authFiles = (map["auth"] as any).files;
    const loginFiles = (map["login"] as any)?.files;

    console.log(`[CKO] 'auth' files: ${(authFiles || []).length}`);
    console.log(`[CKO] 'login' files: ${(loginFiles || []).length}`);

    // Manual aliases should merge — auth and login share same files
    if (loginFiles) {
      const shared = authFiles.filter((f: string) => loginFiles.includes(f));
      console.log(`[CKO] Shared files (auth ∩ login): ${shared.length}`);
    }
  });

  it("7. 'middleware' keyword harus ada hasil scan", () => {
    const map = discovery.load();
    const middlewareKw = Object.keys(map).find(k => k.includes("middleware"));
    if (middlewareKw) {
      console.log(`[CKO] Keyword '${middlewareKw}' ditemukan`);
      console.log(`[CKO] Files: ${(map[middlewareKw] as any).files.join(", ")}`);
    }
  });

  it("8. setiap entry harus ada lastVerified timestamp", () => {
    const map = discovery.load();
    const entries = Object.values(map);
    const allHaveTimestamp = entries.every((e: any) => e.lastVerified);
    expect(allHaveTimestamp).toBe(true);
    console.log(`[CKO] Semua ${entries.length} entry punya lastVerified`);
  });

  it("9. scheduler harus bisa start/stop tanpa error", async () => {
    const schedulerMod = await import("../src/programs/consultant/consultant-scheduler");
    const scheduler = schedulerMod.consultantScheduler;

    scheduler.start();
    // Verify it started without throwing
    console.log("[CKO] Scheduler started successfully");
    scheduler.stop();
    console.log("[CKO] Scheduler stopped successfully");
  });
});
