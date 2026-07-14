// ECP-023: Foundation Cache — loads and caches Foundation assets
// Reads foundation-loader output + foundation-fingerprint.json
// Cache invalidated when fingerprint changes.

import { foundationLoader } from "../foundation-loader";
import type { FoundationCache } from "./types/foundation-types";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { redisService } from "../../../lib/redis";

let _cache: FoundationCache | null = null;
const REDIS_KEY_PREFIX = "foundation:cache:";

function loadFingerprint(): { fingerprint: string; generatedAt: string; documentCount: number } | null {
  const candidates = [
    join(process.cwd(), "foundation-fingerprint.json"),
    join(process.cwd(), "..", "..", "foundation-fingerprint.json"),
    join(process.cwd(), "artifacts", "api-server", "foundation-fingerprint.json"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, "utf-8");
        return JSON.parse(raw);
      } catch { continue; }
    }
  }
  return null;
}

export function getCache(): FoundationCache {
  const fp = loadFingerprint();
  const currentFingerprint = fp?.fingerprint || "unknown";

  if (_cache && _cache.fingerprint === currentFingerprint) {
    return _cache;
  }

  const assets = foundationLoader.load();
  const docs = assets.map(a => ({
    id: a.id,
    title: a.title,
    artifact_type: a.artifact_type,
    lifecycle: "",
    stability: a.stability,
    version: a.version,
    knowledge_level: a.knowledge_level,
    loading_strategy: a.loading_strategy,
    last_updated: "",
    depends_on: a.depends_on || [],
    authorized_consumers: (a as any).authorized_consumers || a.consumers || [],
  }));

  _cache = {
    fingerprint: currentFingerprint,
    generatedAt: fp?.generatedAt || new Date().toISOString(),
    documentCount: docs.length,
    documents: docs,
    loadedAt: Date.now(),
  };

  return _cache;
}

/** Seed Redis cache with current foundation data — call after boot */
export async function preloadFoundationCache(): Promise<void> {
  if (!redisService.initialized) return;
  const cache = getCache();
  const key = REDIS_KEY_PREFIX + cache.fingerprint;
  await redisService.cache.set(key, cache, 3600);
  console.log("[FoundationCache] Preloaded into Redis");
}

export function invalidateCache(): void {
  _cache = null;
}

export function getAsset(id: string): import("./types/foundation-types").DocumentMeta | undefined {
  const cache = getCache();
  return cache.documents.find(d => d.id === id);
}

export function getAssetContent(id: string): string {
  const assets = foundationLoader.load();
  const asset = assets.find(a => a.id === id);
  return asset?.content || "";
}
