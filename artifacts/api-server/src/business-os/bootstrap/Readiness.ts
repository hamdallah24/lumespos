export type SubsystemStatus = "pending" | "initializing" | "ready" | "failed";

export class Readiness {
  private statuses: Map<string, SubsystemStatus> = new Map();
  private errors: Map<string, string> = new Map();
  private startedAt = 0;
  private _ready = false;

  constructor(subsystems: string[]) {
    for (const s of subsystems) {
      this.statuses.set(s, "pending");
    }
  }

  start(): void {
    this.startedAt = Date.now();
  }

  setInitializing(subsystem: string): void {
    this.statuses.set(subsystem, "initializing");
  }

  setReady(subsystem: string): void {
    this.statuses.set(subsystem, "ready");
  }

  setFailed(subsystem: string, reason: string): void {
    this.statuses.set(subsystem, "failed");
    this.errors.set(subsystem, reason);
  }

  isReady(): boolean {
    return this._ready;
  }

  markReady(): void {
    this._ready = true;
  }

  getStatus(subsystem: string): SubsystemStatus {
    return this.statuses.get(subsystem) || "pending";
  }

  getAllStatuses(): Record<string, SubsystemStatus> {
    const result: Record<string, SubsystemStatus> = {};
    for (const [name, status] of this.statuses) {
      result[name] = status;
    }
    return result;
  }

  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  hasFailures(): boolean {
    return Array.from(this.statuses.values()).some(s => s === "failed");
  }

  getElapsed(): number {
    return this.startedAt > 0 ? Date.now() - this.startedAt : 0;
  }

  getOverallPercent(): number {
    const total = this.statuses.size;
    if (total === 0) return 100;
    const ready = Array.from(this.statuses.values()).filter(s => s === "ready").length;
    return Math.round((ready / total) * 100);
  }

  getSummary(): string[] {
    const lines: string[] = [];
    for (const [name, status] of this.statuses) {
      const icon = status === "ready" ? "✓" : status === "failed" ? "✗" : status === "initializing" ? "●" : "○";
      const error = this.errors.get(name);
      lines.push(`${icon} ${name}${error ? ` — ${error}` : ""}`);
    }
    return lines;
  }

  reset(): void {
    for (const key of this.statuses.keys()) {
      this.statuses.set(key, "pending");
    }
    this.errors.clear();
    this._ready = false;
    this.startedAt = 0;
  }
}

export function createReadiness(): Readiness {
  return new Readiness([
    "Runtime",
    "RIC",
    "Capability",
    "Events",
    "Workspace",
    "Council",
    "Execution",
    "Memory",
    "Knowledge",
  ]);
}
