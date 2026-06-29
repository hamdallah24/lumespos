// SPRINT 3.5: Execution Context — per-request observable lifecycle
// Every request gets one ExecutionContext. Every component writes to it.

export interface TraceStep {
  component: string;
  action: string;          // e.g., "fetch", "validate", "execute", "render"
  startedAt: number;       // Date.now()
  durationMs?: number;
  status: "pending" | "ok" | "error" | "timeout";
  error?: string;
  metadata?: Record<string, any>;  // component-specific: tokens, toolName, etc.
}

export interface ToolTrace {
  name: string;
  durationMs: number;
  status: "ok" | "error";
  error?: string;
}

export class ExecutionContext {
  readonly requestId: string;
  readonly startedAt: number;
  readonly userId: number;
  readonly mode: string;

  trace: TraceStep[] = [];
  tools: ToolTrace[] = [];
  errors: { step: string; message: string }[] = [];
  metrics: Record<string, number> = {};  // tokenCount, roundCount, retryCount, etc.

  private _currentStep: TraceStep | null = null;

  constructor(userId: number, mode: string) {
    this.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = Date.now();
    this.userId = userId;
    this.mode = mode;
  }

  /** Start a pipeline step */
  step(component: string, action: string, metadata?: Record<string, any>): void {
    this._currentStep = { component, action, startedAt: Date.now(), status: "pending", metadata };
  }

  /** End the current step */
  end(status: "ok" | "error" = "ok", error?: string): void {
    if (!this._currentStep) return;
    this._currentStep.durationMs = Date.now() - this._currentStep.startedAt;
    this._currentStep.status = status;
    if (error) this._currentStep.error = error;
    this.trace.push({ ...this._currentStep });
    if (status === "error") this.errors.push({ step: this._currentStep.component, message: error || "unknown" });
    this._currentStep = null;
  }

  /** Record a tool execution */
  tool(name: string, durationMs: number, error?: string): void {
    this.tools.push({ name, durationMs, status: error ? "error" : "ok", error });
  }

  /** Set a metric value */
  setMetric(key: string, value: number): void {
    this.metrics[key] = value;
  }

  /** Increment a counter metric */
  incMetric(key: string): void {
    this.metrics[key] = (this.metrics[key] || 0) + 1;
  }

  /** Get total duration */
  get totalDurationMs(): number {
    return Date.now() - this.startedAt;
  }

  /** Export as readable report */
  report(): string {
    const lines = [
      `Request: ${this.requestId}`,
      `User: ${this.userId} | Mode: ${this.mode}`,
      `Duration: ${this.totalDurationMs}ms`,
      `Metrics: ${JSON.stringify(this.metrics)}`,
      ``,
      `Pipeline (${this.trace.length} steps):`,
    ];

    for (const s of this.trace) {
      const icon = s.status === "ok" ? "✅" : s.status === "error" ? "❌" : "⏱️";
      const meta = s.metadata ? ` (${JSON.stringify(s.metadata)})` : "";
      const err = s.error ? ` — ${s.error}` : "";
      lines.push(`  ${icon} ${s.component}.${s.action} ${s.durationMs}ms${meta}${err}`);
    }

    if (this.tools.length > 0) {
      lines.push(``, `Tools (${this.tools.length}):`);
      for (const t of this.tools) {
        lines.push(`  ${t.status === "ok" ? "✅" : "❌"} ${t.name} ${t.durationMs}ms${t.error ? ` — ${t.error}` : ""}`);
      }
    }

    if (this.errors.length > 0) {
      lines.push(``, `Errors (${this.errors.length}):`);
      for (const e of this.errors) {
        lines.push(`  ❌ ${e.step}: ${e.message}`);
      }
    }

    return lines.join("\n");
  }
}
