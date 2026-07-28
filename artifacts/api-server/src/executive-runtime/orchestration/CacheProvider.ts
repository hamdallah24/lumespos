interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheProvider {
  private contextCache = new Map<string, CacheEntry<any>>();
  private decisionCache = new Map<string, CacheEntry<any>>();
  private groundingCache = new Map<string, CacheEntry<any>>();
  private workspaceCache = new Map<string, CacheEntry<any>>();
  private sessionCache = new Map<string, CacheEntry<any>>();

  private defaultTTLMs = 5 * 60 * 1000; // 5 minutes

  getContext<T>(key: string): T | undefined {
    return this.get(this.contextCache, key);
  }

  setContext<T>(key: string, value: T, ttlMs?: number): void {
    this.set(this.contextCache, key, value, ttlMs);
  }

  getDecision<T>(key: string): T | undefined {
    return this.get(this.decisionCache, key);
  }

  setDecision<T>(key: string, value: T, ttlMs?: number): void {
    this.set(this.decisionCache, key, value, ttlMs);
  }

  getGrounding<T>(key: string): T | undefined {
    return this.get(this.groundingCache, key);
  }

  setGrounding<T>(key: string, value: T, ttlMs?: number): void {
    this.set(this.groundingCache, key, value, ttlMs);
  }

  getWorkspace<T>(key: string): T | undefined {
    return this.get(this.workspaceCache, key);
  }

  setWorkspace<T>(key: string, value: T, ttlMs?: number): void {
    this.set(this.workspaceCache, key, value, ttlMs);
  }

  getSession<T>(key: string): T | undefined {
    return this.get(this.sessionCache, key);
  }

  setSession<T>(key: string, value: T, ttlMs?: number): void {
    this.set(this.sessionCache, key, value, ttlMs);
  }

  private get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private set<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTLMs;
    cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  invalidateAll(): void {
    this.contextCache.clear();
    this.decisionCache.clear();
    this.groundingCache.clear();
    this.workspaceCache.clear();
    this.sessionCache.clear();
  }

  size(): { context: number; decision: number; grounding: number; workspace: number; session: number } {
    return {
      context: this.contextCache.size,
      decision: this.decisionCache.size,
      grounding: this.groundingCache.size,
      workspace: this.workspaceCache.size,
      session: this.sessionCache.size,
    };
  }
}

let instance: CacheProvider | null = null;

export function getCacheProvider(): CacheProvider {
  if (!instance) instance = new CacheProvider();
  return instance;
}
