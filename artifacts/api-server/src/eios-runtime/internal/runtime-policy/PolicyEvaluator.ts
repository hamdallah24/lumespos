import type { PolicyContext } from "../../contracts/PolicyContracts";

export const PolicyEvaluator = {
  evaluate(rule: string, ctx: PolicyContext): boolean {
    const trimmed = rule.trim();

    if (trimmed.includes("<")) {
      const parts = trimmed.split("<");
      if (parts.length === 2) {
        const left = this.resolveValue(parts[0].trim(), ctx);
        const right = this.resolveValue(parts[1].trim(), ctx);
        if (left !== undefined && right !== undefined) return left < right;
      }
    }

    if (trimmed.includes(">")) {
      const parts = trimmed.split(">");
      if (parts.length === 2) {
        const left = this.resolveValue(parts[0].trim(), ctx);
        const right = this.resolveValue(parts[1].trim(), ctx);
        if (left !== undefined && right !== undefined) return left > right;
      }
    }

    if (trimmed.includes("==")) {
      const parts = trimmed.split("==");
      if (parts.length === 2) {
        const left = this.resolveValue(parts[0].trim(), ctx);
        const right = this.resolveValue(parts[1].trim(), ctx);
        if (left !== undefined && right !== undefined) return left === right;
      }
    }

    return false;
  },

  resolveValue(expr: string, ctx: PolicyContext): number | undefined {
    const num = Number(expr);
    if (!isNaN(num)) return num;
    const val = ctx.read(expr);
    return typeof val === "number" ? val : undefined;
  },

  getThreshold(rule: string): number | undefined {
    const match = rule.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : undefined;
  },

  extractRuleValue(rule: string, ctx: PolicyContext): number | undefined {
    const parts = rule.split(/[<>=]/);
    if (parts.length >= 2) {
      const field = parts[0].trim();
      return this.resolveValue(field, ctx);
    }
    return undefined;
  },
};
