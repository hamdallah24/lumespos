const DEFAULT_TTL: Record<string, number> = {
  kpis: 60_000,
  forecasts: 300_000,
  benchmarks: 600_000,
  narratives: 120_000,
  health: 120_000,
  analytics: 120_000,
  full: 60_000,
};

export class BIContextCache {
  private store = new Map<string, { data: any; expiresAt: number }>();

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    const duration = ttl ?? DEFAULT_TTL[key] ?? 60_000;
    this.store.set(key, { data, expiresAt: Date.now() + duration });
  }

  clear(key?: string): void {
    if (key) this.store.delete(key);
    else this.store.clear();
  }

  isFresh(key: string): boolean {
    const entry = this.store.get(key);
    return !!entry && Date.now() <= entry.expiresAt;
  }

  getTTL(key: string): number | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return Math.max(0, entry.expiresAt - Date.now());
  }

  setTTL(key: string, ttl: number): void {
    const entry = this.store.get(key);
    if (entry) entry.expiresAt = Date.now() + ttl;
  }

  get size(): number { return this.store.size; }
}
