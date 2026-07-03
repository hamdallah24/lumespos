// ECP-031.5: Runtime Context — canonical identity for every AI request
// Frozen. Single source of truth. All Runtimes, Engines, Memory receive this.
// No more primitive identity params (userId, mode, runtime) passed separately.

export type RuntimeSource = "chat" | "mission" | "scheduler" | "consultant" | "api";
export type RuntimeRole = "CEO" | "CTO" | "COO" | "Chat" | "CKO" | "System";

export interface RuntimeContext {
  requestId: string;
  runtime: RuntimeRole;
  user: { id: number; role?: string };
  conversation: { id?: string };
  mission: { id?: string };
  session: { id: string };
  metadata: { source: RuntimeSource; mode?: string; branchId?: number };
}

let _ctxCounter = 0;

export function createContext(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  _ctxCounter++;
  const now = Date.now().toString(36);
  return {
    requestId: `req_${now}_${_ctxCounter}`,
    runtime: "CEO",
    user: { id: 0 },
    conversation: {},
    mission: {},
    session: { id: `sess_${now}` },
    metadata: { source: "chat" },
    ...overrides,
  };
}

export function cloneContext(ctx: RuntimeContext, overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  return {
    ...JSON.parse(JSON.stringify(ctx)),
    ...overrides,
  };
}

export function getUserId(ctx: RuntimeContext): number {
  return ctx.user.id;
}

export function getMode(ctx: RuntimeContext): string {
  return ctx.metadata.mode || ctx.runtime.toLowerCase();
}
