import type { BusinessFact } from "../../business-intelligence/core/types";
import type { OperationalSituation } from "../core";
import { buildSituation } from "../core";
import { getRules } from "./RuleRegistry";

export class RuleEngine {
  evaluate(facts: BusinessFact[]): OperationalSituation[] {
    const situations: OperationalSituation[] = [];
    const rules = getRules();

    for (const fact of facts) {
      for (const rule of rules) {
        try {
          if (rule.condition(fact)) {
            const overrides = rule.handler(fact);
            const situation = buildSituation(fact, overrides);
            situations.push(situation);
          }
        } catch (err) {
          console.error(`[RuleEngine] Rule "${rule.name}" failed for fact ${fact.id}:`, err);
        }
      }
    }

    return situations;
  }

  evaluateByDomain(facts: BusinessFact[], domain: string): OperationalSituation[] {
    return this.evaluate(facts.filter(f => f.domain === domain));
  }
}

export const ruleEngine = new RuleEngine();
