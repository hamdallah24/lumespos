import { getRICAdapter } from '../../runtime-intelligence-core/RICAdapter';
import type { ExecutiveContext } from '../../runtime-intelligence-core/ExecutiveContextAdapter';
import type { RuntimeContext } from '../../runtime-intelligence-core/types';
import { ceoRuntime } from '../../executive-runtime/executives/CEO';
import { ctoProgram } from '../../executive-runtime/executives/CTO';
import { cooRuntime } from '../../executive-runtime/executives/COO';
import { cfoRuntime } from '../../executive-runtime/executives/CFO';
import { cmoRuntime } from '../../executive-runtime/executives/CMO';
import { caioRuntime } from '../../executive-runtime/executives/CAIO';
import { ckoRuntime } from '../../executive-runtime/executives/CKO';
import { chroRuntime } from '../../executive-runtime/executives/CHRO';

export interface ExecuteMessageParams {
  message: string;
  userId: number;
  mode?: string;
  branchId?: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: 'started' | 'completed'; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: unknown) => void;
  executiveContext?: Record<string, unknown>;
  runtimeContext?: RuntimeContext;
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

interface GatewayInput {
  message: string;
  userId: number;
  mode?: string;
  branchId?: number;
  target?: string;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: 'started' | 'completed'; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: unknown) => void;
}

type ExecFn = (params: ExecuteMessageParams) => Promise<{ success: boolean; text: string; pipeline?: string[]; decision?: any; toolsUsed?: number; filesRead?: string[] }>;

const EXECUTIVES: Record<string, ExecFn> = {
  CEO: async (p) => {
    const r = await ceoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, onTool: p.onTool, onState: p.onState, onExecutionEvent: p.onExecutionEvent });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
  },
  CTO: async (p) => {
    const r = await ctoProgram.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, onExecutionEvent: p.onExecutionEvent, runtimeContext: p.runtimeContext });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], toolsUsed: r.toolsUsed, filesRead: r.filesRead };
  },
  COO: async (p) => {
    const r = await cooRuntime.execute({ message: p.message, userId: p.userId, branchId: p.branchId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
  CFO: async (p) => {
    const r = await cfoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
  CMO: async (p) => {
    const r = await cmoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
  CAIO: async (p) => {
    const r = await caioRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
  CHRO: async (p) => {
    const r = await chroRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
  CKO: async (p) => {
    const r = await ckoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [] };
  },
};

function buildResult(name: string, raw: { success: boolean; text: string; pipeline?: string[]; decision?: any; toolsUsed?: number; filesRead?: string[] }, durationMs: number): ExecuteMessageResult {
  return {
    success: raw.success,
    text: raw.text || '',
    runtime: name,
    pipeline: raw.pipeline || [],
    toolsUsed: raw.toolsUsed,
    filesRead: raw.filesRead,
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

export class RuntimeGateway {
  private ricReady = false;

  async initialize(rootDir: string): Promise<void> {
    try {
      const adapter = getRICAdapter();
      if (!adapter.isEnabled()) {
        await adapter.initialize(rootDir);
      }
      this.ricReady = true;
    } catch {
      this.ricReady = false;
    }
  }

  isReady(): boolean {
    return this.ricReady;
  }

  getExecutive(name: string): { execute: (params: ExecuteMessageParams) => Promise<ExecuteMessageResult> } | null {
    const fn = EXECUTIVES[name];
    if (!fn) return null;
    return {
      execute: async (params) => {
        const t0 = Date.now();
        const raw = await fn(params);
        return buildResult(name, raw, Date.now() - t0);
      },
    };
  }

  async assemble(input: GatewayInput): Promise<ExecuteMessageResult> {
    const t0 = Date.now();

    // Step 1: Build RuntimeContext via RIC
    let runtimeContext: RuntimeContext | null = null;
    let executiveContext: ExecutiveContext | null = null;

    if (this.ricReady) {
      try {
        const adapter = getRICAdapter();
        runtimeContext = await adapter.assemble({
          message: input.message,
          userId: input.userId,
          branchId: input.branchId,
        });
        executiveContext = adapter.getExecutiveContext();
      } catch {
        runtimeContext = null;
        executiveContext = null;
      }
    }

    // Step 2: Dispatch to executive
    const target = input.target || 'CEO';
    const fn = EXECUTIVES[target];
    if (!fn) {
      return {
        success: false, text: `Runtime ${target} not available`, runtime: target,
        pipeline: [], metrics: { runtime: target, tokensUsed: 0, toolsCalled: 0, durationMs: Date.now() - t0, delegated: false, verificationPassed: false, knowledgeWritten: false },
      };
    }

    const raw = await fn({
      message: input.message,
      userId: input.userId,
      mode: input.mode,
      branchId: input.branchId,
      onProgress: input.onProgress,
      onTool: input.onTool,
      onState: input.onState,
      onExecutionEvent: input.onExecutionEvent,
      executiveContext: executiveContext ? (executiveContext as unknown as Record<string, unknown>) : undefined,
      runtimeContext: runtimeContext ?? undefined,
    });

    const result = buildResult(target, raw, Date.now() - t0);

    // Step 3: Attach RIC metadata
    if (runtimeContext && executiveContext) {
      (result as any).runtimeContext = runtimeContext;
      (result as any).executiveContext = executiveContext;
      (result as any).ricActive = true;
    }

    return result;
  }

  async assembleForTargets(targets: string[], input: GatewayInput): Promise<Map<string, ExecuteMessageResult>> {
    const results = new Map<string, ExecuteMessageResult>();

    const settled = await Promise.allSettled(
      targets.map(async (target) => {
        const r = await this.assemble({ ...input, target });
        results.set(target, r);
      }),
    );

    for (let i = 0; i < settled.length; i++) {
      const t = targets[i];
      if (settled[i].status === 'rejected' && !results.has(t)) {
        results.set(t, {
          success: false, text: `_${t}: Gagal memproses_`, runtime: t,
          pipeline: [], metrics: { runtime: t, tokensUsed: 0, toolsCalled: 0, durationMs: 0, delegated: false, verificationPassed: false, knowledgeWritten: false },
        });
      }
    }

    return results;
  }
}

let instance: RuntimeGateway | null = null;

export function getRuntimeGateway(): RuntimeGateway {
  if (!instance) instance = new RuntimeGateway();
  return instance;
}
