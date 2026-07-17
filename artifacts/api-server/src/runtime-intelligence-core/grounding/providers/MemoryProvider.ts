import type { GroundingProvider, MemoryRequest, MemoryEntry, HealthStatus } from '../../types';

const AVAILABLE_STORES = new Set(['working', 'decision', 'knowledge', 'episodic', 'mission', 'conversation']);

export class MemoryProvider implements GroundingProvider<MemoryRequest, MemoryEntry> {
  async read(needs: MemoryRequest[]): Promise<MemoryEntry[]> {
    if (needs.length === 0) return [];
    return needs.map(need => ({
      id: `mem-${need.type}-${Date.now()}`,
      type: need.type,
      content: `[stub] Memory retrieval for: ${need.description}`,
      timestamp: Date.now(),
    }));
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, latency: 0 };
  }

  isStoreAvailable(type: string): boolean {
    return AVAILABLE_STORES.has(type);
  }
}
