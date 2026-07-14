import type { MemoryRecord, DuplicateResult, DuplicateRelation } from "../models/MemoryRecord";

export interface DuplicateDetectorConfig {
  identicalThreshold: number;
  similarThreshold: number;
  conflictingThreshold: number;
}

const DEFAULT_CONFIG: DuplicateDetectorConfig = {
  identicalThreshold: 0.95,
  similarThreshold: 0.6,
  conflictingThreshold: 0.3,
};

export class DuplicateDetector {
  constructor(private config: DuplicateDetectorConfig = DEFAULT_CONFIG) {}

  check(record: MemoryRecord, existing: MemoryRecord[]): DuplicateResult[] {
    const results: DuplicateResult[] = [];

    for (const other of existing) {
      if (other.id === record.id) continue;

      const similarity = this.calculateSimilarity(record.content, other.content);
      const relation = this.classifyRelation(record, other, similarity);

      if (relation) {
        results.push({
          sourceId: record.id,
          targetId: other.id,
          relation,
          similarityScore: similarity,
        });
      }
    }

    return results;
  }

  checkPair(a: MemoryRecord, b: MemoryRecord): DuplicateResult | null {
    const similarity = this.calculateSimilarity(a.content, b.content);
    const relation = this.classifyRelation(a, b, similarity);
    if (!relation) return null;

    return {
      sourceId: a.id,
      targetId: b.id,
      relation,
      similarityScore: similarity,
    };
  }

  private classifyRelation(a: MemoryRecord, b: MemoryRecord, similarity: number): DuplicateRelation | null {
    if (similarity >= this.config.identicalThreshold) return "identical";

    if (similarity >= this.config.similarThreshold) return "similar";

    if (this.isConflicting(a, b) && similarity >= this.config.conflictingThreshold) return "conflicting";

    if (this.isComplementary(a, b)) return "complementary";

    return null;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;

    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);

    if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const intersection = tokensA.filter(t => tokensB.includes(t));
    const union = [...new Set([...tokensA, ...tokensB])];

    const jaccard = intersection.length / union.length;

    const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);

    return jaccard * 0.7 + lengthRatio * 0.3;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  private isConflicting(a: MemoryRecord, b: MemoryRecord): boolean {
    const numericA = this.extractNumericValues(a.content);
    const numericB = this.extractNumericValues(b.content);

    for (const key of Object.keys(numericA)) {
      if (numericB[key] !== undefined && Math.abs(numericA[key] - numericB[key]) / Math.max(Math.abs(numericA[key]), 1) > 0.3) {
        return true;
      }
    }

    return false;
  }

  private isComplementary(a: MemoryRecord, b: MemoryRecord): boolean {
    return a.category !== b.category && a.scope === b.scope;
  }

  private extractNumericValues(text: string): Record<string, number> {
    const result: Record<string, number> = {};
    const patterns = [
      { key: "revenue", regex: /revenue\s*[:=]?\s*(\d+(?:\.\d+)?)/i },
      { key: "cost", regex: /cost\s*[:=]?\s*(\d+(?:\.\d+)?)/i },
      { key: "count", regex: /(\d+)\s*(?:users|customers|employees|members)/i },
      { key: "percentage", regex: /(\d+(?:\.\d+)?)\s*%/i },
    ];

    for (const { key, regex } of patterns) {
      const match = text.match(regex);
      if (match) {
        result[key] = parseFloat(match[1]);
      }
    }

    return result;
  }
}
