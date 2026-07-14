import type { PolicyResult, PolicyExplanation, PolicyContext } from "../../contracts/PolicyContracts";
import { PolicyRegistry } from "./PolicyRegistry";
import { PolicyEvaluator } from "./PolicyEvaluator";

export const PolicyEngine = {
  evaluate(ctx: PolicyContext): PolicyResult {
    const policies = PolicyRegistry.getPoliciesFor(ctx.scope);
    const actions: string[] = [];

    for (const policy of policies) {
      if (PolicyEvaluator.evaluate(policy.condition, ctx)) {
        actions.push(policy.action);
      }
    }

    return { passed: actions.length === 0, actions };
  },

  explain(ctx: PolicyContext): PolicyExplanation[] {
    const explanations: PolicyExplanation[] = [];
    const policies = PolicyRegistry.getPoliciesFor(ctx.scope);

    for (const policy of policies) {
      const ruleValue = PolicyEvaluator.extractRuleValue(policy.condition, ctx);
      const threshold = PolicyEvaluator.getThreshold(policy.condition);

      if (ruleValue !== undefined && threshold !== undefined) {
        const triggered = PolicyEvaluator.evaluate(policy.condition, ctx);
        if (triggered) {
          explanations.push({
            action: policy.action,
            reason: `${policy.condition}: ${ruleValue} vs threshold ${threshold}`,
            rule: policy.condition,
            threshold,
            actualValue: ruleValue,
            source: policy.id,
            chain: [],
          });
        }
      }
    }

    return explanations;
  },
};
