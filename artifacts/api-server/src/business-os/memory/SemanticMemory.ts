import { EpisodicMemory, type EpisodicEntry } from "./EpisodicMemory";

export interface SemanticPattern {
  id: string;
  type: "correlation" | "sequence" | "threshold" | "trend";
  description: string;
  confidence: number;
  evidence: string[];
  lastConfirmed: string;
  hitCount: number;
}

export interface BusinessRule {
  id: string;
  condition: string;
  action: string;
  confidence: number;
  source: string;
  createdAt: string;
}

export class SemanticMemory {
  private patterns: SemanticPattern[] = [];
  private rules: BusinessRule[] = [];
  private episodic: EpisodicMemory;

  constructor(episodic: EpisodicMemory) {
    this.episodic = episodic;
  }

  learnFromEpisodes(): SemanticPattern[] {
    const newPatterns: SemanticPattern[] = [];
    const executives = [...new Set(this.episodic.recall({}).map(e => e.executive))];

    for (const exec of executives) {
      const successPatterns = this.episodic.getSuccessPatterns(exec);
      for (const sp of successPatterns) {
        if (sp.count >= 3) {
          const existing = this.patterns.find(p => p.description.includes(sp.action) && p.type === "correlation");
          if (!existing) {
            const pattern: SemanticPattern = {
              id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: "correlation",
              description: `${exec} has ${sp.count} successful ${sp.action} actions`,
              confidence: sp.avgConfidence,
              evidence: [sp.action],
              lastConfirmed: new Date().toISOString(),
              hitCount: sp.count,
            };
            this.patterns.push(pattern);
            newPatterns.push(pattern);
          }
        }
      }

      const failurePatterns = this.episodic.getFailurePatterns(exec);
      for (const fp of failurePatterns) {
        if (fp.count >= 2) {
          const existing = this.patterns.find(p => p.description.includes(fp.action) && p.type === "threshold");
          if (!existing) {
            const pattern: SemanticPattern = {
              id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: "threshold",
              description: `${exec} has ${fp.count} failed ${fp.action} attempts — consider alternative approach`,
              confidence: Math.max(0.3, 1 - (1 / fp.count)),
              evidence: [fp.action],
              lastConfirmed: new Date().toISOString(),
              hitCount: fp.count,
            };
            this.patterns.push(pattern);
            newPatterns.push(pattern);
          }
        }
      }
    }

    return newPatterns;
  }

  addRule(condition: string, action: string, confidence: number, source: string): BusinessRule {
    const rule: BusinessRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      condition, action, confidence, source,
      createdAt: new Date().toISOString(),
    };
    this.rules.push(rule);
    return rule;
  }

  infer(executive: string, situation: string): SemanticPattern[] {
    return this.patterns.filter(p =>
      p.evidence.some(e => situation.toLowerCase().includes(e.toLowerCase())) &&
      p.description.startsWith(executive)
    ).sort((a, b) => b.confidence - a.confidence);
  }

  getApplicableRules(executive: string): BusinessRule[] {
    return this.rules.filter(r => r.source === executive).sort((a, b) => b.confidence - a.confidence);
  }

  getPatterns(): SemanticPattern[] { return [...this.patterns]; }
  getRules(): BusinessRule[] { return [...this.rules]; }
  patternCount(): number { return this.patterns.length; }
  ruleCount(): number { return this.rules.length; }
}
