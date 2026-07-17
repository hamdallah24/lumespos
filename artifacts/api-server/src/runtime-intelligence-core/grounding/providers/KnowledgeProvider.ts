import type { GroundingProvider, RetrievalRequest, KnowledgeBlock, HealthStatus } from '../../types';

export class KnowledgeProvider implements GroundingProvider<RetrievalRequest, KnowledgeBlock> {
  async read(needs: RetrievalRequest[]): Promise<KnowledgeBlock[]> {
    if (needs.length === 0) return [];
    return needs.map(need => ({
      id: `knowledge-${Date.now()}`,
      content: `[stub] Knowledge retrieval for: ${need.description}`,
      source: 'KnowledgeProvider',
      confidence: 0.9,
    }));
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, latency: 0 };
  }
}
