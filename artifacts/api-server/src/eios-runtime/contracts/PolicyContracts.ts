import type { ComponentId } from "./ComponentId";

export interface PolicyRule {
  id: ComponentId;
  condition: string;
  action: string;
  priority: number;
}

export interface PolicyResult {
  passed: boolean;
  actions: string[];
}

export interface PolicyExplanation {
  action: string;
  reason: string;
  rule: string;
  threshold: number;
  actualValue: number;
  source: ComponentId;
  chain: PolicyExplanation[];
}

export interface PolicyContext {
  scope: string;
  read(key: string): unknown;
}
