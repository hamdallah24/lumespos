import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMITS = new Map<string, RateLimitEntry>();

export const APIHardener = {
  sanitize(input: unknown, maxDepth = 5): unknown {
    if (maxDepth <= 0) return "[truncated]";
    if (typeof input === "string") {
      if (input.length > 10000) return input.slice(0, 10000);
      return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
    }
    if (Array.isArray(input)) return input.map(i => this.sanitize(i, maxDepth - 1));
    if (typeof input === "object" && input !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (/^\$/.test(k)) continue;
        sanitized[k] = this.sanitize(v, maxDepth - 1);
      }
      return sanitized;
    }
    return input;
  },

  rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = RATE_LIMITS.get(key);
    if (!entry || now > entry.resetAt) {
      RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxRequests) {
      RuntimeLogger.warn("APIHardener", `Rate limit exceeded for "${key}"`);
      return false;
    }
    entry.count++;
    return true;
  },

  validateInput(payload: unknown, allowedKeys: string[]): { valid: boolean; error?: string } {
    if (typeof payload !== "object" || payload === null) return { valid: false, error: "Payload must be an object" };
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (!allowedKeys.includes(key)) return { valid: false, error: `Unexpected key "${key}"` };
    }
    return { valid: true };
  },

  clearRateLimits(): void { RATE_LIMITS.clear(); },
};
