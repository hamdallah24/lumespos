import type { BusinessFact } from "../../business-intelligence/core/types";
import type { OperationalSituation } from "../core";

export type RuleCondition = (fact: BusinessFact) => boolean;
export type RuleHandler = (fact: BusinessFact) => Partial<OperationalSituation>;

export interface Rule {
  name: string;
  condition: RuleCondition;
  handler: RuleHandler;
}

const rules = new Map<string, Rule>();

export function registerRule(name: string, condition: RuleCondition, handler: RuleHandler): void {
  rules.set(name, { name, condition, handler });
}

export function getRules(): Rule[] {
  return Array.from(rules.values());
}

export function getRule(name: string): Rule | undefined {
  return rules.get(name);
}
