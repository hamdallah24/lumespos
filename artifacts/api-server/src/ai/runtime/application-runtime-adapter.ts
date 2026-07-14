// ECP-047: Application Runtime Adapter — single bridge between Application and EIOS
// Application may access EIOS ONLY through this adapter.
// Adapter uses EIOS public API (ExecutiveDispatchRegistry, ObserverEngine) and
// directly invokes executive runtimes for full LLM execution.
// No orchestration logic — pure forwarding.

import { ceoRuntime } from "../../executive-runtime/executives/CEO";
import { ctoProgram } from "../../executive-runtime/executives/CTO";
import { cooRuntime } from "../../executive-runtime/executives/COO";
import { cfoRuntime } from "../../executive-runtime/executives/CFO";
import { cmoRuntime } from "../../executive-runtime/executives/CMO";
import { caioRuntime } from "../../executive-runtime/executives/CAIO";
import { ckoRuntime } from "../../executive-runtime/executives/CKO";
import { chroRuntime } from "../../executive-runtime/executives/CHRO";

export interface ExecuteMessageParams {
  message: string;
  userId: number;
  mode?: string;
  branchId?: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: unknown) => void;
}

export interface ExecuteMessageResult {
  success: boolean;
  text: string;
  runtime: string;
  pipeline: string[];
  toolsUsed?: number;
  filesRead?: string[];
  metrics: {
    runtime: string;
    tokensUsed: number;
    toolsCalled: number;
    durationMs: number;
    delegated: boolean;
    delegatedTo?: string;
    verificationPassed: boolean;
    knowledgeWritten: boolean;
    confidence?: number;
    findings?: any[];
  };
}

type RawExecResult = { success: boolean; text: string; pipeline?: string[]; decision?: any; toolsUsed?: number; filesRead?: string[] };

const registry = new Map<string, (params: ExecuteMessageParams) => Promise<RawExecResult>>();

function register(name: string, fn: (params: ExecuteMessageParams) => Promise<RawExecResult>): void {
  registry.set(name, fn);
}

register("CEO", async (params) => {
  const result = await ceoRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress, onTool: params.onTool,
    onState: params.onState, onExecutionEvent: params.onExecutionEvent,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
    decision: result.decision,
  };
});

register("CTO", async (params) => {
  const result = await ctoProgram.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
    onExecutionEvent: params.onExecutionEvent,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
    toolsUsed: result.toolsUsed, filesRead: result.filesRead,
  };
});

register("COO", async (params) => {
  const result = await cooRuntime.execute({
    message: params.message, userId: params.userId, branchId: params.branchId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

register("CFO", async (params) => {
  const result = await cfoRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

register("CMO", async (params) => {
  const result = await cmoRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

register("CAIO", async (params) => {
  const result = await caioRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

register("CHRO", async (params) => {
  const result = await chroRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

register("CKO", async (params) => {
  const result = await ckoRuntime.execute({
    message: params.message, userId: params.userId,
    onProgress: params.onProgress,
  });
  return {
    success: result.success, text: result.text,
    pipeline: result.pipeline || [],
  };
});

function buildResult(name: string, raw: RawExecResult, durationMs: number): ExecuteMessageResult {
  return {
    success: raw.success,
    text: raw.text || "",
    runtime: name,
    pipeline: raw.pipeline || [],
    toolsUsed: (raw as any).toolsUsed,
    filesRead: (raw as any).filesRead,
    metrics: {
      runtime: name,
      tokensUsed: 0,
      toolsCalled: 0,
      durationMs,
      delegated: !!(raw as any).decision?.delegation,
      delegatedTo: (raw as any).decision?.delegation?.runtime,
      verificationPassed: raw.success,
      knowledgeWritten: false,
    },
  };
}

export const applicationRuntime = {
  getExecutive(name: string): { execute: (params: ExecuteMessageParams) => Promise<ExecuteMessageResult> } | null {
    const fn = registry.get(name);
    if (!fn) return null;
    return {
      execute: async (params) => {
        const t0 = Date.now();
        const raw = await fn(params);
        return buildResult(name, raw, Date.now() - t0);
      },
    };
  },

  async executeMessage(params: ExecuteMessageParams & { target?: string }): Promise<ExecuteMessageResult> {
    const t0 = Date.now();
    const target = params.target || "CEO";
    const fn = registry.get(target);
    if (!fn) {
      return {
        success: false, text: `Runtime ${target} not available`, runtime: target,
        pipeline: [], metrics: { runtime: target, tokensUsed: 0, toolsCalled: 0, durationMs: Date.now() - t0, delegated: false, verificationPassed: false, knowledgeWritten: false },
      };
    }
    const raw = await fn(params);
    return buildResult(target, raw, Date.now() - t0);
  },

  async executeForTargets(targets: string[], params: ExecuteMessageParams): Promise<Map<string, ExecuteMessageResult>> {
    const results = new Map<string, ExecuteMessageResult>();
    const settled = await Promise.allSettled(
      targets.map(async (t) => {
        const fn = registry.get(t);
        if (!fn) throw new Error(`Runtime ${t} not found`);
        const t0 = Date.now();
        const raw = await fn(params);
        results.set(t, buildResult(t, raw, Date.now() - t0));
      }),
    );
    for (let i = 0; i < settled.length; i++) {
      const t = targets[i];
      if (settled[i].status === "rejected" && !results.has(t)) {
        results.set(t, {
          success: false, text: `_${t}: Gagal memproses_`, runtime: t,
          pipeline: [], metrics: { runtime: t, tokensUsed: 0, toolsCalled: 0, durationMs: 0, delegated: false, verificationPassed: false, knowledgeWritten: false },
        });
      }
    }
    return results;
  },
};
