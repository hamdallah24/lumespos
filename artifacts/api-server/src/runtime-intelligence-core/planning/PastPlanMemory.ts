import type { RetrievalPlan, UnderstandingResult } from '../types';

interface StoredPlan {
  intent: string;
  subIntent: string;
  domain: string;
  plan: RetrievalPlan;
  confidenceAfter: number;
  timestamp: number;
  hitCount: number;
}

export class PastPlanMemory {
  private plans: StoredPlan[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  store(plan: RetrievalPlan, understanding: UnderstandingResult, confidenceAfter: number): void {
    this.plans.unshift({
      intent: understanding.intent,
      subIntent: understanding.subIntent,
      domain: understanding.domain.primary,
      plan: this.clonePlan(plan),
      confidenceAfter,
      timestamp: Date.now(),
      hitCount: 0,
    });

    if (this.plans.length > this.maxSize) {
      this.plans.length = this.maxSize;
    }
  }

  findSimilar(intent: string, domain: string, subIntent?: string, limit: number = 3): StoredPlan[] {
    const scored = this.plans.map(p => {
      let score = 0;
      if (p.intent === intent) score += 3;
      if (p.domain === domain) score += 2;
      if (subIntent && p.subIntent === subIntent) score += 1;
      return { plan: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const matches = scored.filter(s => s.score > 0).slice(0, limit);

    for (const m of matches) {
      m.plan.hitCount++;
    }

    return matches.map(m => m.plan);
  }

  getStats(): { totalStored: number; topDomains: string[]; topIntents: string[] } {
    const domainCount = new Map<string, number>();
    const intentCount = new Map<string, number>();
    for (const p of this.plans) {
      domainCount.set(p.domain, (domainCount.get(p.domain) ?? 0) + 1);
      intentCount.set(p.intent, (intentCount.get(p.intent) ?? 0) + 1);
    }
    const byValue = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    return {
      totalStored: this.plans.length,
      topDomains: byValue(domainCount),
      topIntents: byValue(intentCount),
    };
  }

  private clonePlan(plan: RetrievalPlan): RetrievalPlan {
    return JSON.parse(JSON.stringify(plan));
  }
}
