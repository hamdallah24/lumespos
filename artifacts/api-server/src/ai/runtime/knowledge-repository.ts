// SPRINT 8: Knowledge Repository — LRU cache + invalidation
// ECP-008: Reusable by Memory Runtime (Sprint 14)

import type { KnowledgeNode } from "./knowledge-graph";

interface CacheEntry {
  nodes: KnowledgeNode[];
  addedAt: number;
  ttlMs: number;
}

/** In-memory LRU cache with TTL */
class KnowledgeRepository {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /** Get cached entry by key */
  get(key: string): KnowledgeNode[] | null {
    const entry = this.cache.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.addedAt > entry.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    this.touch(key);
    return entry.nodes;
  }

  /** Set cache entry */
  set(key: string, nodes: KnowledgeNode[], ttlMs = 300000): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { nodes, addedAt: Date.now(), ttlMs });
    this.touch(key);
  }

  /** Invalidate all entries */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /** Invalidate by key prefix */
  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
    this.accessOrder = this.accessOrder.filter(k => !k.startsWith(prefix));
  }

  /** Get metrics */
  metrics(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? Math.round((this.hits / total) * 100) : 0,
    };
  }

  private touch(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }
}

// Singleton (shared across all knowledge loaders)
export const knowledgeRepo = new KnowledgeRepository(50);

// Component metadata
export const knowledgeRepository = {
  name: "KnowledgeRepository",
  version: "1.0.0",
  capabilities: ["knowledge-caching", "ttl-invalidation", "lru-eviction"],
  dependencies: [],
  health: () => {
    const m = knowledgeRepo.metrics();
    return {
      status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
      custom: m,
    };
  },
  cache: knowledgeRepo,
};
