import type { GroundingProvider, OperationalRequest, OperationalData, HealthStatus } from '../../types';

export class OperationalTruthProvider implements GroundingProvider<OperationalRequest, OperationalData> {
  async read(needs: OperationalRequest[]): Promise<OperationalData[]> {
    if (needs.length === 0) return [];
    return needs.map(need => ({
      type: need.dataType,
      data: { requested: need.description, parameters: need.parameters },
      source: 'OperationalTruthProvider',
      timestamp: Date.now(),
    }));
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, latency: 0 };
  }
}
