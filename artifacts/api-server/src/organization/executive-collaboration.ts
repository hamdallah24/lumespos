// ECP-042: Executive Collaboration — Session lifecycle + task distribution + result collection
// Engine TIDAK melakukan reasoning. Engine HANYA mendistribusi dan mengumpulkan.
// CEO melakukan sintesis akhir. Organization Engine adalah dispatcher tunggal.
// ECP-047: executeMission() — multi-executive parallel dispatch + collect.

import { createTask } from "./executive-task";
import type { ExecutiveRole, ExecutiveTask, ExecutiveResult } from "./executive-task";
import type { IRuntime, RuntimeContext } from "../ai/runtime/orchestrator/runtime-interface";
import { knowledgeBackbone } from "../knowledge/KnowledgeBackbone";

export type CollaborationState = "CREATED" | "RUNNING" | "COLLECTING" | "COMPLETED" | "FAILED";

export interface CollaborationSession {
  id: string;
  state: CollaborationState;
  tasks: ExecutiveTask[];
  results: ExecutiveResult[];
  createdAt: string;
  completedAt?: string;
}

interface DelegationEntry {
  runtimeId: string;
  runtime: string;
  reason: string;
  fallback: boolean;
}

let _sessionCounter = 0;

export class ExecutiveCollaboration {

  private sessions: Map<string, CollaborationSession> = new Map();

  /** Create a new collaboration session */
  createSession(): CollaborationSession {
    _sessionCounter++;
    const session: CollaborationSession = {
      id: `SESSION-${Date.now().toString(36)}-${_sessionCounter}`,
      state: "CREATED",
      tasks: [],
      results: [],
      createdAt: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Assign tasks to executives via Organization Engine dispatch */
  assignTask(
    session: CollaborationSession,
    task: ExecutiveTask,
  ): void {
    session.tasks.push(task);
  }

  /** Get the next pending task for an executive */
  getPendingTask(session: CollaborationSession, role: ExecutiveRole): ExecutiveTask | null {
    return session.tasks.find(t =>
      t.assignedTo.includes(role) && t.status === "PENDING"
    ) || null;
  }

  /** Record an executive's result */
  submitResult(session: CollaborationSession, result: ExecutiveResult): void {
    // Mark corresponding task as completed
    const task = session.tasks.find(t => t.id === result.taskId);
    if (task) {
      task.status = result.status;
      task.completedAt = new Date().toISOString();
    }
    session.results.push(result);
  }

  /** Check if all tasks in session are complete */
  isComplete(session: CollaborationSession): boolean {
    const activeTasks = session.tasks.filter(t => t.status === "PENDING" || t.status === "RUNNING");
    return activeTasks.length === 0;
  }

  /** Collect all results — returns raw collection, no synthesis */
  collectResults(session: CollaborationSession): ExecutiveResult[] {
    session.state = "COLLECTING";
    const sorted = [...session.results].sort((a, b) => b.confidence - a.confidence);
    session.state = "COMPLETED";
    session.completedAt = new Date().toISOString();
    return sorted;
  }

  /** Get session by ID */
  getSession(id: string): CollaborationSession | null {
    return this.sessions.get(id) || null;
  }

  /**
   * ECP-047: Execute a multi-executive mission.
   * Creates session, dispatches runtimes in parallel, collects results,
   * triggers learning/collective/governance, returns synthesis context.
   * Executive Collaboration NEVER synthesizes — CEO does.
   */
  async executeMission(
    executives: DelegationEntry[],
    ctx: RuntimeContext,
    objective: string,
  ): Promise<{ executiveResults: ExecutiveResult[]; synthesisContext: string }> {
    const session = this.createSession();
    session.state = "RUNNING";

    // Create tasks and resolve runtimes
    const dispatchList: { exec: DelegationEntry; task: ExecutiveTask; runtime: IRuntime }[] = [];

    for (const exec of executives) {
      const task = createTask(
        `Executive Analysis: ${objective.slice(0, 60)}`,
        objective,
        "CEO",
        [exec.runtime as ExecutiveRole],
        "HIGH",
      );
      this.assignTask(session, task);

      // Resolve runtime from SSOT registry (internal dispatch, NOT resolver)
      const { orchestrator } = await import("../ai/runtime/orchestrator");
      const runtime = orchestrator.getRuntime(exec.runtime);
      if (runtime) {
        dispatchList.push({ exec, task, runtime });
      }
    }

    if (dispatchList.length === 0) {
      session.state = "FAILED";
      return { executiveResults: [], synthesisContext: "" };
    }

    // Parallel dispatch — each runtime runs its own Pipeline/Driver/Governor lifecycle
    const toolEvents: { name: string; durationMs: number; status: "ok" | "error" }[] = [];
    const results = await Promise.all(
      dispatchList.map(async ({ exec, task, runtime }) => {
        const t0 = Date.now();
        try {
          const execCtx: RuntimeContext = {
            ...ctx,
            message: `[Executive Task: ${exec.runtime}] ${objective}`,
            onProgress: (msg) => ctx.onProgress?.(`[${exec.runtime}] ${msg}`),
            onTool: (ev) => {
              toolEvents.push({ name: ev.name || "unknown", durationMs: ev.durationMs || 0, status: ev.status === "completed" ? "ok" : "error" });
              ctx.onTool?.({ ...ev, name: `[${exec.runtime}] ${ev.name}` });
            },
            onState: (state) => ctx.onState?.((`${exec.runtime}: ${state}`) as any),
          };
          const runtimeResult = await runtime.execute(execCtx);
          console.log("[CTO-IN]", execCtx.message.slice(0, 200));
          console.log("[CTO-OUT]", runtimeResult.text?.slice(0, 300));
          const execResult: ExecutiveResult = {
            taskId: task.id,
            executive: exec.runtime as ExecutiveRole,
            status: runtimeResult.success ? "COMPLETED" : "FAILED",
            content: runtimeResult.text?.slice(0, 8000) || "",
            confidence: runtimeResult.metrics?.confidence || 70,  // ECP-014R: read from metrics, fallback 70
            durationMs: Date.now() - t0,
            findings: (runtimeResult as any).findings || undefined,  // ECP-014R
          };
          this.submitResult(session, execResult);
          return execResult;
        } catch (e: any) {
          const execResult: ExecutiveResult = {
            taskId: task.id,
            executive: exec.runtime as ExecutiveRole,
            status: "FAILED",
            content: `Error: ${e?.message?.slice(0, 500) || "unknown"}`,
            confidence: 0,
            durationMs: Date.now() - t0,
            error: e?.message,
          };
          this.submitResult(session, execResult);
          return execResult;
        }
      }),
    );

    // Collect
    this.collectResults(session);

    // Learning
    try {
      const { learningEngine } = await import("../learning/learning-engine");
      for (const r of results) {
        learningEngine.cycle(
          session.id,
          objective,
          r.executive as any,
          `exec-${r.executive}`,
          {
            success: r.status === "COMPLETED",
            duration: r.durationMs,
            tokenUsage: 0,
            toolUsage: 0,
            confidence: r.confidence,
            lessons: [],
          },
        );
      }
    } catch {}

    // Collective Intelligence
    try {
      const { organizationIntelligence } = await import("../intelligence/organization-intelligence");
      organizationIntelligence.onLearningComplete(
        ("CEO") as any,
        session.id,
        results.every(r => r.status === "COMPLETED") ? "SUCCESS" : "PARTIAL",
        "general",
        [],
      );
    } catch {}

    // Governance
    try {
      const { governanceEngine } = await import("../governance/governance-engine");
      governanceEngine.health();
    } catch {}

    // ADR-009: Metrics — Evidence + Mission Progress
    try {
      const { buildArtifacts } = await import("../metrics/ArtifactBuilder");
      const { artifactRepository } = await import("../metrics/ArtifactRepository");
      const { evidenceEngine } = await import("../metrics/EvidenceEngine");
      const { missionProgressEngine } = await import("../metrics/MissionProgressEngine");
      const { createMission } = await import("../mission/MissionFactory");

      // Build artifacts from collected tool events
      if (toolEvents.length > 0) {
        const artifacts = buildArtifacts(toolEvents);
        artifactRepository.appendAll(artifacts);
      }

      const mission = createMission({
        objective,
        subObjectives: [objective],
        createdBy: "CEO" as any,
        assignedTo: executives.map(e => e.runtime) as any,
      });
      mission.state = "COMPLETED";

      const evidence = evidenceEngine.evaluate();
      const progress = missionProgressEngine.compute(mission.contract);

      // Emit evidence + mission via callback
      ctx.onExecutionEvent?.({
        type: "evidence_update", schemaVersion: 1,
        timestamp: new Date().toISOString(), missionId: session.id,
        payload: evidence,
      } as any);

      ctx.onExecutionEvent?.({
        type: "mission_update", schemaVersion: 1,
        timestamp: new Date().toISOString(), missionId: session.id,
        payload: progress,
      } as any);
    } catch {}

    // RFC-010 P2: Mission History — record completion reason with audit trail
    try {
      const { missionHistory } = await import("../mission/MissionHistory");
      for (const r of results) {
        missionHistory.record(
          session.id,
          `obj-${r.executive}`,
          `artifact-${session.id}`,
          `evidence-${session.id}`,
          `Completed by ${r.executive} (confidence: ${r.confidence}%, status: ${r.status})`,
          r.executive as any,
        );
      }
    } catch {}

    // RFC-012: Knowledge Backbone — record decisions + update executive memory
    try {
      // ECP-014R: Collect evidence from tool events
      for (const ev of toolEvents) {
        knowledgeBackbone.addEvidence({
          type: ev.name.includes("read") ? "file_read" : ev.name.includes("exec") ? "command_output" : "search_result",
          source: ev.name,
          content: `${ev.name} executed (${ev.status}, ${ev.durationMs}ms)`,
          timestamp: new Date().toISOString(),
        });
      }

      for (const r of results) {
        // Record decision in Backbone
        knowledgeBackbone.recordDecision(
          session.id,
          objective,
          [r.executive],
          [r.status],
          r.status === "COMPLETED" ? "Completed" : "Failed",
        );
        // Update executive memory
        knowledgeBackbone.updateMemory(r.executive, {
          currentFindings: [r.status === "COMPLETED" ? objective : `Failed: ${objective}`],
          completedTasks: r.status === "COMPLETED" ? [objective] : [],
          confidence: r.confidence,
        });
      }
    } catch {}

    // Build synthesis context — include structured findings when available
    const contextParts = results.map(r => {
      const base = `## ${r.executive} Runtime Status: ${r.status}` +
        `\nConfidence: ${r.confidence}%` +
        (r.error ? `\nError: ${r.error}` : "") +
        `\nOutput Length: ${r.content?.length || 0} chars`;

      // ECP-014R: Include structured findings if available
      if (r.findings && r.findings.length > 0) {
        const findingsText = r.findings.map(f =>
          `\n  - [${f.severity}] ${f.title}: ${f.statement}\n    Recommendation: ${f.recommendation}`
        ).join("");
        return `${base}\n\n## Structured Findings (${r.findings.length} items)${findingsText}\n\n---\n## Raw Output\n${r.content || "(none)"}`;
      }
      return `${base}\n\n${r.content || "(no output produced)"}`;
    });

    return {
      executiveResults: results,
      synthesisContext: contextParts.join("\n\n---\n\n"),
    };
  }
}

export const executiveCollaboration = new ExecutiveCollaboration();
