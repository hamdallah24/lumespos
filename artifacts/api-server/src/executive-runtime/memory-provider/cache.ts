// T.0.2 Phase 5 — Two-tier caching (L1 in-memory)
// LOCKED: T01_MEMORY_CACHING.md

import { memoryConfig } from "./config";
import type { MemoryContext } from "./types";

interface CacheEntry {
  result: MemoryContext;
  expiry: number;
}

export class L1Cache {
  private store = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];

  private makeKey(executive: string, domain: string, scope: string, query: string): string {
    const hash = this.simpleHash(query);
    return `memory::${executive}::${domain}::${scope}::${hash}`;
  }

  private simpleHash(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).slice(0, 8);
  }

  get(executive: string, domain: string, scope: string, query: string): MemoryContext | null {
    if (!memoryConfig.cacheEnabled) return null;

    const key = this.makeKey(executive, domain, scope, query);
    const entry = this.store.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }

    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    return entry.result;
  }

  set(executive: string, domain: string, scope: string, query: string, result: MemoryContext, ttlMs?: number): void {
    if (!memoryConfig.cacheEnabled) return;

    if (this.store.size >= memoryConfig.l1MaxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.store.delete(oldest);
    }

    const key = this.makeKey(executive, domain, scope, query);
    this.store.set(key, {
      result,
      expiry: Date.now() + (ttlMs ?? memoryConfig.l1TtlMs),
    });
    this.accessOrder.push(key);
  }

  invalidateByExecutive(executive: string): void {
    const pattern = `memory::${executive}`;
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
      }
    }
  }
}

export const l1Cache = new L1Cache();
