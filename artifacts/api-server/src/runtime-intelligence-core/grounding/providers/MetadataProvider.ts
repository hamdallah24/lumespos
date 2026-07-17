import type { GroundingProvider, MetadataRequest, MetadataNode, HealthStatus } from '../../types';

export class MetadataProvider implements GroundingProvider<MetadataRequest, MetadataNode> {
  async read(needs: MetadataRequest[]): Promise<MetadataNode[]> {
    if (needs.length === 0) return [];
    return needs.map(need => ({
      id: `meta-${need.nodeType}-${Date.now()}`,
      type: need.nodeType,
      properties: { requested: need.nodeType },
      relationships: [],
    }));
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, latency: 0 };
  }
}
