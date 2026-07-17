// CKO Runtime — Wrapper over programs/consultant with Knowledge Platform integration
// Delegates to consultantRuntime for core advisory, adds EIOS knowledge recording.

import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import { councilSessionManager } from "../../../executive-council";
import { consultantRuntime, type CKOTargets } from "../../../programs/consultant";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";

const ckoCognitive = new CognitiveEngine();
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import { auditEngine } from "../../../governance/core";
import { BriefGenerator, type ExecutiveBrief } from "../../core";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { CKO_CONFIG } from "./CKO.config";

interface ExecutiveTask {
  message: string;
  userId: number;
  onProgress?: (msg: string) => void;
  runtimeContext?: import('../../../runtime-intelligence-core/types').RuntimeContext;
}

interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  console.log(`[PIPELINE:CKO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId}`);

  pipeline.push("Identity");
  task.onProgress?.("🧠 CKO Runtime: Knowledge Officer aktif");

  // Read Memory — prefer RuntimeContext if available
  let memoryCtx = null;
  const rc = task.runtimeContext;
  if (rc?.grounding.memory.entries.length) {
    memoryCtx = { workingMemory: rc.grounding.memory.entries.map(e => e.content).join('\n'), knowledgeContext: '', organizationalMemory: '' };
    pipeline.push("RuntimeMemory");
  } else {
    try {
      memoryCtx = await memoryProvider.read({
        executive: "CKO", query: task.message, domain: "knowledge",
        memoryScope: "organization", maxTokens: 3000,
      });
    } catch { /* MemoryProvider unavailable */ }
  }

  // Cognitive Engine — think before advisory/LLM
  let cognitiveResult = null;
  try {
    cognitiveResult = await ckoCognitive.think({
      role: "CKO", query: task.message,
      context: { memoryContext: memoryCtx },
    });
    recordTrace("CKO", task.message, cognitiveResult.trace);
    await writeDecisionToMemory("CKO", task.message, cognitiveResult);
    pipeline.push("CognitiveEngine");
    task.onProgress?.("🧠 CKO: Cognitive reasoning completed");
  } catch { /* CognitiveEngine unavailable */ }

  // Use understanding from RuntimeContext instead of raw text parsing
  const lower = (rc?.intelligence.subIntent ?? task.message).toLowerCase();

  // Council secretary mode
  if (lower.includes("council") || lower.includes("rapat") || lower.includes("minutes") || lower.includes("notulen")) {
    pipeline.push("CouncilSecretary");
    task.onProgress?.("📋 CKO: Menyusun laporan council...");
    try {
      const log = councilSessionManager.getAll();
      const recentSessions = log.slice(-5);
      const summary = recentSessions.map((s: { sessionId?: string; status?: string; decisions?: { length: number } }) =>
        `- Council ${s.sessionId || "?"}: ${s.status || "?"} — ${s.decisions?.length || 0} keputusan`
      ).join("\n");
      return {
        success: true,
        text: `📋 **Council Activity Log**\n\n${summary || "Belum ada sesi council tercatat."}\n\n> — CKO · Council Secretary`,
        pipeline,
      };
    } catch {
      return { success: false, text: "❌ Gagal mengakses council log.", pipeline };
    }
  }

  // Advisory mode — delegate to consultantRuntime
  pipeline.push("Advisory");
  task.onProgress?.("🤖 CKO: Memberikan advisory...");
  try {
    const result = await consultantRuntime.analyze("founder_advisory", task.message);
    if (result.success && result.text) {
      pipeline.push("KnowledgeRecording");

      // EIOS: Record this advisory interaction as knowledge
      KnowledgeProvider.ingestEpisode({
        eventType: "cko_advisory",
        eventId: `CKO-${Date.now()}`,
        context: task.message.slice(0, 500),
        outcome: "success",
        domain: "knowledge",
        topic: task.message.slice(0, 100),
        summary: `CKO advisory: ${result.text.slice(0, 200)}`,
        tags: ["cko", "advisory"],
      });

      auditEngine.log({ actor: "CKO", action: "advise", resource: "knowledge", result: "allowed", reason: "CKO advisory provided", metadata: { userId: task.userId } });

      return {
        success: true,
        text: result.text,
        pipeline,
      };
    }
  } catch { /* consultantRuntime unavailable */ }

  // Fallback: direct LLM with knowledge context
  pipeline.push("DirectLLM");
  task.onProgress?.("📚 CKO: Menggunakan knowledge base...");
  const knowledge: any[] = rc?.grounding.knowledge.length ? rc.grounding.knowledge : KnowledgeProvider.searchAll(task.message);
  const stats = KnowledgeProvider.getStats();
  const brief = BriefGenerator.generate({
    role: "CKO",
    situations: [],
    objectives: [],
    plans: [],
    knowledge,
  });

  const memoryBlock = memoryCtx ? [memoryCtx.workingMemory, memoryCtx.knowledgeContext, memoryCtx.organizationalMemory].filter(Boolean).join("\n") : "";

  const prompt = `# Identitas
Kamu adalah **Chief Knowledge Officer (CKO)** Lume's Everywhere — jaringan F&B.

# Wewenang
- Kurasi pengetahuan organisasi
- Sekretaris council
- Manajemen best practices
- Rekomendasi pembelajaran

# Knowledge Platform Stats
Total: ${stats.total} blocks | Semantic: ${stats.semantic} | Episode: ${stats.episode} | Procedural: ${stats.procedural} | Confirmed: ${stats.learning?.confirmed ?? 0}

# Pengetahuan Relevan
${knowledge.slice(0, 10).map(k => `[${k.type}] ${k.summary} (confidence: ${k.confidence}%)`).join("\n") || "Tidak ada"}

${memoryBlock ? `# Memory Context\n${memoryBlock}\n` : ""}
# Brief Hari Ini
${JSON.stringify(brief, null, 2).slice(0, 2000)}

# Tugasmu
Tanggapi pesan user dari perspektif CKO. Fokus pada kurasi pengetahuan, best practices, dan saran pembelajaran organisasi.`;

  auditEngine.log({ actor: "CKO" as any, action: "execute", resource: "program", result: "allowed", reason: "CKO program execution", metadata: { userId: task.userId } });

  const result = await executiveReason({ persona: prompt, context: task.message, userId: task.userId });

  KnowledgeProvider.ingestEpisode({
    eventType: "cko_direct_llm",
    eventId: `CKO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: "success",
    domain: "knowledge",
    topic: task.message.slice(0, 100),
    summary: `CKO direct: ${result.content.slice(0, 200)}`,
    tags: ["cko", "direct"],
  });

  return { success: true, text: result.content, pipeline };
}

async function decide(brief: ExecutiveBrief, _context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const knowledgeSections = brief.sections.filter(s => s.title.toLowerCase().includes("knowledge"));
  if (knowledgeSections.length > 0) {
    return {
      role: "CKO",
      action: "curate_knowledge",
      reasoning: `${knowledgeSections.length} knowledge areas identified from brief — recommending curation`,
      confidence: 80,
      payload: { knowledgeItems: knowledgeSections.flatMap(s => s.items) },
    };
  }
  return {
    role: "CKO",
    action: "monitor_knowledge",
    reasoning: `No curation needed — ${brief.summary}`,
    confidence: 90,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { role: "CKO", maturity: "L2" },
  };
}

export const ckoRuntime = {
  name: "CKORuntime",
  version: "1.0.0",
  capabilities: ["knowledge-curation", "council-secretary", "best-practices", "advisory", "learning-recommendation"],
  dependencies: ["ConsultantRuntime", "KnowledgePlatform", "Council"],
  health,
  execute,
  decide,
};
