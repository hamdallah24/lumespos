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
import { mapContextForRole } from '../../executive-context/ExecutiveContextAdapter';
import { DelegationEngine } from '../../executive-runtime/orchestration/DelegationEngine';
import { ExecutionWorkspace } from '../../executive-runtime/orchestration/ExecutionWorkspace';
import { getExecutionHistory } from '../../executive-runtime/orchestration/ExecutionHistory';
import { getCacheProvider } from '../../executive-runtime/orchestration/CacheProvider';
import { getMetricsCollector } from '../../executive-runtime/orchestration/MetricsCollector';
import { getExecutionEngine } from '../../executive-runtime/execution/ExecutionEngine';
import type { ExecutiveDecision } from '../../erp-execution/types';
import type { DecisionObject } from '../../executive-runtime/types';
import { BIContextBuilder } from '../../business-os/bi/context/BIContextBuilder';
import { ExecutiveBIAdapter } from '../../business-os/bi/context/ExecutiveBIAdapter';
import { BIFeedbackEngine } from '../../business-os/bi/feedback/BIFeedbackEngine';

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
  onEvent?: (event: { stage: string; type: string; data: any }) => void;
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
  decision?: DecisionObject | null;
  executionResult?: any;
  workspace?: any;
  ricActive?: boolean;
  runtimeContext?: RuntimeContext;
  executiveContext?: ExecutiveContext;
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
  onEvent?: (event: { stage: string; type: string; data: any }) => void;
}

type ExecFn = (params: ExecuteMessageParams) => Promise<{ success: boolean; text: string; pipeline?: string[]; decision?: any; toolsUsed?: number; filesRead?: string[] }>;

const EXECUTIVES: Record<string, ExecFn> = {
  CEO: async (p) => {
    const r = await ceoRuntime.execute({
      message: p.message, userId: p.userId,
      onProgress: p.onProgress, onTool: p.onTool, onState: p.onState, onExecutionEvent: p.onExecutionEvent,
      runtimeContext: p.runtimeContext,
    });
    return { success: r.success, text: r.text, pipeline: (r as any).pipeline || [], decision: (r as any).decision };
  },
  CTO: async (p) => {
    const r = await ctoProgram.execute({
      message: p.message, userId: p.userId,
      onProgress: p.onProgress, onExecutionEvent: p.onExecutionEvent,
      runtimeContext: p.runtimeContext,
    });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], toolsUsed: r.toolsUsed, filesRead: r.filesRead, decision: (r as any).decision };
  },
  COO: async (p) => {
    const ctx = mapContextForRole("COO", p.runtimeContext as RuntimeContext);
    const r = await cooRuntime.execute({ message: p.message, userId: p.userId, branchId: p.branchId, onProgress: p.onProgress, context: ctx });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
  },
  CFO: async (p) => {
    const ctx = mapContextForRole("CFO", p.runtimeContext as RuntimeContext);
    const r = await cfoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, context: ctx });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
  },
  CMO: async (p) => {
    const ctx = mapContextForRole("CMO", p.runtimeContext as RuntimeContext);
    const r = await cmoRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, context: ctx });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
  },
  CAIO: async (p) => {
    const ctx = mapContextForRole("CAIO", p.runtimeContext as RuntimeContext);
    const r = await caioRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, context: ctx });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
  },
  CHRO: async (p) => {
    const ctx = mapContextForRole("CHRO", p.runtimeContext as RuntimeContext);
    const r = await chroRuntime.execute({ message: p.message, userId: p.userId, onProgress: p.onProgress, context: ctx });
    return { success: r.success, text: r.text, pipeline: r.pipeline || [], decision: r.decision };
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
    decision: raw.decision || null,
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

function emitEvent(input: GatewayInput, stage: string, type: string, data: any): void {
  input.onEvent?.({ stage, type, data });
  input.onState?.(stage);
}

export class RuntimeGateway {
  private ricReady = false;
  private delegationEngine = new DelegationEngine();
  private feedbackEngine = new BIFeedbackEngine();

  async initialize(rootDir: string): Promise<void> {
    try {
      const adapter = getRICAdapter();
      if (!adapter.isEnabled()) {
        await adapter.initialize(rootDir);
      }
      this.ricReady = true;
      getExecutionEngine().initialize();
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
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const cache = getCacheProvider();
    const history = getExecutionHistory();
    const metrics = getMetricsCollector();

    const workspace = new ExecutionWorkspace(requestId, input.message, input.userId, input.branchId || 1);
    workspace.emit("thinking", { stage: "initialized", requestId });

    let runtimeContext: RuntimeContext | null = null;
    let executiveContext: ExecutiveContext | null = null;
    let decision: DecisionObject | null = null;
    let executionResult: any = null;
    let finalText = "";
    let pipeline: string[] = [];

    try {
      // === STAGE 1: RIC Assembly + Grounding ===
      emitEvent(input, "ric", "start", {});
      workspace.addThinking("Membangun Runtime Context melalui RIC...");

      if (this.ricReady) {
        try {
          const adapter = getRICAdapter();
          const cacheKey = `grounding:${input.userId}:${input.branchId || 1}`;
          runtimeContext = cache.getGrounding<RuntimeContext>(cacheKey);
          if (!runtimeContext) {
            runtimeContext = await adapter.assemble({
              message: input.message,
              userId: input.userId,
              branchId: input.branchId,
            });
            cache.setGrounding(cacheKey, runtimeContext, 30000);
          }
          executiveContext = adapter.getExecutiveContext();
          workspace.setRuntimeContext(runtimeContext);
          pipeline.push("Grounding");
        } catch {
          runtimeContext = null;
          executiveContext = null;
          workspace.addReasoning("RIC unavailable, proceeding without runtime context");
        }
      }
      workspace.emit("thinking", { stage: "ric", completed: true });
      emitEvent(input, "ric", "complete", { ready: !!runtimeContext });

      // === STAGE 2: Executive Selection ===
      emitEvent(input, "delegation", "start", {});
      workspace.addThinking("Menentukan Executive yang tepat...");
      const delegation = this.delegationEngine.select(input.message, input.userId, input.target);
      const target = delegation.primary;
      const supporting = delegation.supporting;

      workspace.setSelectedExecutive(target, supporting);
      pipeline.push(`Select:${target}`);
      emitEvent(input, "delegation", "complete", delegation);

      // Inject capabilities for the selected executive
      if (this.ricReady) {
        try {
          const adapter = getRICAdapter();
          const enrichedContext = adapter.getExecutiveContext(target);
          if (enrichedContext) {
            executiveContext = enrichedContext;
          }
        } catch { }
      }

      // === STAGE 2.5: BI Context Enrichment ===
      try {
        const biBuilder = new BIContextBuilder();
        const biCtx = await biBuilder.build({ executives: target, message: input.message });
        const biAdapter = new ExecutiveBIAdapter();
        if (executiveContext) {
          (executiveContext as any).businessIntelligence = biCtx;
          (executiveContext as any).executiveBI = biAdapter.map(target, biCtx);
        }
        pipeline.push("BI-Enrich");
      } catch (biErr) {
        pipeline.push("BI-Skip");
      }

      // === STAGE 3: Execute Primary Executive ===
      emitEvent(input, "executive", "start", { executive: target });
      workspace.addThinking(`Mendelegasikan ke ${target}...`);
      const fn = EXECUTIVES[target];

      if (!fn) {
        throw new Error(`Executive ${target} not available`);
      }

      let raw = await fn({
        message: input.message,
        userId: input.userId,
        mode: input.mode,
        branchId: input.branchId,
        onProgress: input.onProgress,
        onTool: input.onTool,
        onState: input.onState,
        onExecutionEvent: input.onExecutionEvent,
        onEvent: input.onEvent,
        executiveContext: executiveContext ? (executiveContext as unknown as Record<string, unknown>) : undefined,
        runtimeContext: runtimeContext ?? undefined,
      });

      decision = raw.decision || null;
      pipeline.push(...(raw.pipeline || []));

      if (decision) {
        workspace.addDecision(decision as any);
        workspace.addReasoning(`Keputusan: ${decision.action} — ${decision.reasoning.slice(0, 200)}`);
      }

      emitEvent(input, "executive", "complete", { decision: !!decision, text: raw.text?.slice(0, 100) });
      workspace.addThinking(`Executive ${target} selesai`);

      // === STAGE 4: Execute Supporting Executives (in parallel) ===
      if (supporting.length > 0) {
        workspace.addThinking(`Mengkonsultasikan ${supporting.join(", ")}...`);
        emitEvent(input, "executive", "start", { supporting });
        const supportingPromises = supporting
          .filter(s => s !== target)
          .map(async (exec) => {
            try {
              const sf = EXECUTIVES[exec];
              if (!sf) return;
              const supResult = await sf({
                message: `[Consultation from ${target}] ${input.message}`,
                userId: input.userId,
                branchId: input.branchId,
                runtimeContext: runtimeContext ?? undefined,
              });
              if (supResult.text) {
                finalText += `\n\n**${exec}**: ${supResult.text}`;
              }
            } catch { }
          });
        await Promise.allSettled(supportingPromises);
        emitEvent(input, "executive", "complete", { supporting: true });
      }

      finalText = raw.text || "";
      pipeline.push("Orchestrate");

      // === STAGE 5: Execute Decision via Execution Layer ===
      if (decision && decision.action) {
        workspace.addThinking(`Mengeksekusi keputusan: ${decision.action}...`);
        emitEvent(input, "execution", "start", { action: decision.action });

        const execDecision: ExecutiveDecision = {
          decisionId: decision.decisionId,
          executive: decision.executive,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          action: decision.action,
          parameters: decision.parameters,
          risks: decision.risks,
          recommendation: decision.recommendation,
          requiresApproval: decision.requiresApproval,
          priority: decision.priority,
          userId: input.userId,
          branchId: input.branchId || 1,
        };

        try {
          executionResult = await getExecutionEngine().execute(execDecision);
          workspace.addExecutionResult(executionResult);
          pipeline.push(`Execute:${decision.action}`);

          if (executionResult.success) {
            finalText = finalText || executionResult.message;
          } else {
            finalText = `Keputusan telah dibuat namun eksekusi memerlukan perhatian: ${executionResult.message}`;
          }
        } catch (execErr: any) {
          pipeline.push("ExecutionError");
          workspace.setError(`Execution failed: ${execErr.message}`);
          finalText = `Keputusan telah dibuat. Eksekusi akan diproses terpisah.`;
        }

        emitEvent(input, "execution", "complete", { success: executionResult?.success });
      }

      // === STAGE 6: Outcome Tracking + BI Feedback ===
      if (decision && decision.decisionId) {
        try {
          this.feedbackEngine.processDecision(
            {
              decisionId: decision.decisionId,
              executive: decision.executive,
              action: decision.action ?? "unknown",
              reasoning: decision.reasoning,
              confidence: decision.confidence,
              parameters: decision.parameters,
            },
            {
              executionId: executionResult?.executionId ?? `exec-${Date.now()}`,
              success: executionResult?.success ?? false,
              message: executionResult?.message ?? "No execution result",
              durationMs: executionResult?.durationMs ?? 0,
            },
          );
          pipeline.push("OutcomeTrack");
        } catch {
          pipeline.push("OutcomeTrack-Error");
        }
      }

      workspace.setSummary(finalText);
      workspace.complete();

      const result = buildResult(target, { ...raw, text: finalText, pipeline }, Date.now() - t0);
      result.decision = decision;
      result.executionResult = executionResult;
      result.workspace = workspace.snapshot();
      if (runtimeContext && executiveContext) {
        (result as any).runtimeContext = runtimeContext;
        (result as any).executiveContext = executiveContext;
        (result as any).ricActive = true;
      }

      // Record history and metrics
      history.record(workspace.snapshot());
      metrics.record({
        latencyMs: Date.now() - t0,
        tokensUsed: 0,
        contextSize: JSON.stringify(runtimeContext || {}).length,
        groundingDurationMs: 0,
        decisionDurationMs: 0,
        executionDurationMs: executionResult?.durationMs || 0,
        confidence: decision?.confidence || 0,
        executive: target,
        action: decision?.action || "none",
        success: result.success,
        timestamp: new Date().toISOString(),
      });

      return result;

    } catch (err: any) {
      const durationMs = Date.now() - t0;
      workspace.setError(err.message);
      workspace.complete();

      // Error recovery: try fallback
      if (!input.target) {
        const fallbackTarget = "CEO";
        const fn = EXECUTIVES[fallbackTarget];
        if (fn && fallbackTarget !== input.target) {
          try {
            const fallbackRaw = await fn({
              message: `[Fallback from error] ${input.message}`,
              userId: input.userId,
              branchId: input.branchId,
            });
            const fallbackResult = buildResult(fallbackTarget, fallbackRaw, Date.now() - t0);
            fallbackResult.workspace = workspace.snapshot();
            metricFallback(metrics, fallbackTarget, fallbackRaw, durationMs);
            return fallbackResult;
          } catch { }
        }
      }

      const result: ExecuteMessageResult = {
        success: false,
        text: `Terjadi kesalahan: ${err.message}`,
        runtime: input.target || "unknown",
        pipeline: [...pipeline, "Error"],
        metrics: {
          runtime: input.target || "unknown",
          tokensUsed: 0,
          toolsCalled: 0,
          durationMs,
          delegated: false,
          verificationPassed: false,
          knowledgeWritten: false,
        },
        workspace: workspace.snapshot(),
      };
      return result;
    }
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

function metricFallback(metrics: ReturnType<typeof getMetricsCollector>, target: string, raw: any, durationMs: number): void {
  try {
    metrics.record({
      latencyMs: durationMs,
      tokensUsed: 0, contextSize: 0, groundingDurationMs: 0,
      decisionDurationMs: 0, executionDurationMs: 0,
      confidence: 0, executive: target, action: "fallback",
      success: raw.success, timestamp: new Date().toISOString(),
    });
  } catch { }
}

let instance: RuntimeGateway | null = null;

export function getRuntimeGateway(): RuntimeGateway {
  if (!instance) instance = new RuntimeGateway();
  return instance;
}
