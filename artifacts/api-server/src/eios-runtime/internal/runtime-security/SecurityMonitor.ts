import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";
import { AuditTrail } from "./AuditTrail";

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: "PERMISSION_DENIED" | "TOKEN_FORGERY" | "BRUTE_FORCE" | "MANIFEST_TAMPER" | "SECRET_LEAK" | "INTRUSION" | "ANOMALY";
  source: string;
  details: string;
  severity: "critical" | "high" | "medium" | "low";
  count: number;
}

const EVENTS: Map<string, SecurityEvent> = new Map();
const ALERT_THRESHOLD = 5;

export const SecurityMonitor = {
  report(type: SecurityEvent["type"], source: string, details: string, severity: SecurityEvent["severity"]): void {
    const key = `${type}:${source}`;
    const existing = EVENTS.get(key);
    if (existing) {
      existing.count++;
      existing.timestamp = new Date().toISOString();
      if (existing.count >= ALERT_THRESHOLD && existing.severity !== "low") {
        RuntimeLogger.error("SecurityMonitor", `ALERT: ${type} from ${source} (${existing.count}x) — ${details}`, { metadata: { severity } });
      }
    } else {
      EVENTS.set(key, { id: `sec-${Date.now().toString(36)}`, timestamp: new Date().toISOString(), type, source, details, severity, count: 1 });
    }

    AuditTrail.record("SECURITY_EVENT", source, `${type}: ${details}`, { severity, eventType: type });
  },

  detectBruteForce(subjectId: string): boolean {
    const key = `PERMISSION_DENIED:${subjectId}`;
    const event = EVENTS.get(key);
    if (event && event.count >= 3) {
      RuntimeLogger.error("SecurityMonitor", `Brute force detected: ${subjectId} (${event.count} denied attempts)`);
      return true;
    }
    return false;
  },

  getEvents(): ReadonlyArray<SecurityEvent> { return Array.from(EVENTS.values()); },

  clear(): void { EVENTS.clear(); },
};
