import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

interface SecureConfig {
  key: string;
  currentValue: unknown;
  defaultValue: unknown;
  risk: string;
  severity: "critical" | "high" | "medium" | "low";
}

const SECURE_VALUES = new Map<string, unknown>();
const AUDIT_LOG: string[] = [];

export const SecureConfiguration = {
  set(key: string, value: unknown): void {
    const old = SECURE_VALUES.get(key);
    SECURE_VALUES.set(key, value);
    AUDIT_LOG.push(`${new Date().toISOString()} SET ${key}: ${JSON.stringify(old)} -> ${JSON.stringify(value)}`);
  },

  get<T>(key: string, fallback: T): T {
    return (SECURE_VALUES.has(key) ? SECURE_VALUES.get(key) as T : fallback);
  },

  auditInsecureDefaults(): SecureConfig[] {
    const results: SecureConfig[] = [];
    const checks: SecureConfig[] = [
      { key: "enableDevMode", currentValue: this.get("enableDevMode", false), defaultValue: false, risk: "Dev mode exposes debug endpoints", severity: "high" },
      { key: "maxRequestSizeBytes", currentValue: this.get("maxRequestSizeBytes", 1048576), defaultValue: 1048576, risk: "Large payloads can cause DoS", severity: "medium" },
      { key: "rateLimitPerMinute", currentValue: this.get("rateLimitPerMinute", 60), defaultValue: 60, risk: "Missing rate limit enables brute force", severity: "high" },
      { key: "corsOrigins", currentValue: this.get("corsOrigins", "*"), defaultValue: "*", risk: "Wildcard CORS allows any origin", severity: "medium" },
      { key: "exposeErrorDetails", currentValue: this.get("exposeErrorDetails", false), defaultValue: false, risk: "Internal details leak in errors", severity: "high" },
      { key: "manifestSignatureRequired", currentValue: this.get("manifestSignatureRequired", true), defaultValue: true, risk: "Unsigned manifests can be tampered", severity: "critical" },
    ];
    for (const c of checks) {
      if (c.currentValue === c.defaultValue && c.defaultValue) results.push(c);
      if (!c.currentValue && c.severity === "critical") results.push(c);
    }
    return results;
  },

  validate(): void {
    const insecure = this.auditInsecureDefaults();
    for (const item of insecure) {
      RuntimeLogger.warn("SecureConfiguration", `Insecure default: ${item.key} — ${item.risk}`, { metadata: { severity: item.severity } });
    }
  },

  getAuditLog(): ReadonlyArray<string> { return AUDIT_LOG; },

  clear(): void { SECURE_VALUES.clear(); AUDIT_LOG.length = 0; },
};
