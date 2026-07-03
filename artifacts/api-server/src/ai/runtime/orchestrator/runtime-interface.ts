// ECP-031: Runtime Interface — standard contract for all Runtimes
// Frozen. EVERY Runtime MUST implement this interface.
// CEO, CTO, COO, Chat, Consultant — identical signature.

import type { RuntimeResult } from "./runtime-result";

export interface RuntimeContext {
  message: string;
  userId: number;
  mode?: string;
  branchId?: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: unknown) => void;
}

export interface IRuntime {
  readonly name: string;
  readonly version: string;
  readonly capabilities: string[];
  readonly identity: { id: string; role: string; authority: string };
  health(): { status: "healthy" | "degraded" | "unhealthy"; uptime: number; version: string };
  canHandle(ctx: RuntimeContext): boolean;
  execute(ctx: RuntimeContext): Promise<RuntimeResult>;
}
