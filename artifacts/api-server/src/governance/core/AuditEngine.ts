import type { ExecutiveRole } from "../governance-types";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: ExecutiveRole;
  action: string;
  resource: string;
  result: "allowed" | "denied";
  reason: string;
  metadata: Record<string, unknown>;
}

let entryCounter = 0;
function nextId(): string {
  entryCounter++;
  return `AUDIT-${Date.now().toString(36)}-${entryCounter}`;
}

export class AuditEngine {
  private entries: AuditEntry[] = [];
  private readonly maxEntries = 10000;

  log(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
    const full: AuditEntry = {
      ...entry,
      id: nextId(),
      timestamp: new Date().toISOString(),
    };
    this.entries.push(full);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return full;
  }

  getByActor(actor: ExecutiveRole): AuditEntry[] {
    return this.entries.filter(e => e.actor === actor);
  }

  getByAction(action: string): AuditEntry[] {
    return this.entries.filter(e => e.action === action);
  }

  getByTimeRange(from: string, to: string): AuditEntry[] {
    return this.entries.filter(e => e.timestamp >= from && e.timestamp <= to);
  }

  getRecent(limit: number = 50): AuditEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  count(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries.length = 0;
  }
}

export const auditEngine = new AuditEngine();
