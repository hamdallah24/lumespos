// T.0.2 Phase 3+4 — MemoryProvider implementation
// T.1 — Integrated with Executive Memory Engine (EME)
// LOCKED: T015_MEMORY_PROVIDER_CONTRACT.md, T015_PIPELINE_LOCK.md, T015_SEQUENCE_FINAL.md

import type { MemoryQuery, MemoryContext, MemoryProvider as IMemoryProvider, WriteMemoryInput, WriteMemoryResult } from "./types";
import { memoryConfig } from "./config";
import { l1Cache } from "./cache";
import { circuitBreaker } from "./circuit-breaker";
import { memoryMetrics } from "./metrics";
import { MemoryEngine } from "../memory/engine/MemoryEngine";

// ── Internal imports to memory subsystems ──
import { contextManager } from "../../memory/ContextManager";
import { ExecutiveMemoryProvider } from "../../executive-memory/ExecutiveMemoryProvider";
import { recall as semanticRecall } from "../../ai/runtime/semantic-memory";
import { orgMemory } from "../../ai/runtime/organizational-memory";
import { organizationalMemory } from "../../intelligence/organizational-memory";
import { IntegrationManager } from "../../learning-integration/IntegrationManager";
import { RedisCache } from "../../lib/redis/redis-cache";
import { redisService } from "../../lib/redis";

function getRedisCache(): RedisCache | null {
  try {
    return redisService.initialized ? redisService.cache : null;
  } catch {
    return null;
  }
}

// ── Helpers ──

function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function hasTemporalReference(query: string): boolean {
  return /(kemarin|sebelumnya|tadi|masih|belum|yang\s+lama|yang\s+dulu)/i.test(query);
}

function truncateByTokens(text: string, maxTokens: number): string {
  if (countTokens(text) <= maxTokens) return text;
  const chars = maxTokens * 4;
  return text.slice(0, chars) + "\n...[truncated]";
}

function formatDecisionsBlock(executive: string, limit: number): string {
  try {
    if (circuitBreaker.isOpen("decisions")) return "";

    const recall = ExecutiveMemoryProvider.recallForExecutive(executive as any, limit);
    if (!recall || recall.records.length === 0) return "";

    const lines = recall.records.map((r, i) => {
      const icon = r.outcome === "success" ? "✓" : r.outcome === "failure" ? "✗" : "◐";
      return `${i + 1}. [${icon}] ${r.title} (${r.domain}) — ${r.selectedOption}`;
    });

    circuitBreaker.reportSuccess("decisions");
    return lines.join("\n");
  } catch (e) {
    circuitBreaker.reportError("decisions");
    return "";
  }
}

function formatWorkingMemoryBlock(executive: string): string {
  try {
    if (circuitBreaker.isOpen("working")) return "";

    const prompt = contextManager.buildMemoryPrompt(executive);
    circuitBreaker.reportSuccess("working");
    return prompt;
  } catch (e) {
    circuitBreaker.reportError("working");
    return "";
  }
}

function formatSemanticMemoryBlock(query: string): string {
  try {
    if (circuitBreaker.isOpen("semantic")) return "";
    if (!hasTemporalReference(query)) return "";

    const result = semanticRecall(query);
    circuitBreaker.reportSuccess("semantic");
    if (!result) return "";

    return `Related: ${result.problem} (${result.domain}) — ${result.resolution}`;
  } catch (e) {
    circuitBreaker.reportError("semantic");
    return "";
  }
}

function formatEpisodicMemoryBlock(query: string): string {
  try {
    if (circuitBreaker.isOpen("episodic")) return "";

    const episodes = orgMemory.search(query, { limit: 3 });
    circuitBreaker.reportSuccess("episodic");
    if (episodes.length === 0) return "";

    return episodes.map(e =>
      `- ${e.mission}: ${e.outcome} — ${e.learnings.slice(0, 2).join("; ")}`
    ).join("\n");
  } catch (e) {
    circuitBreaker.reportError("episodic");
    return "";
  }
}

function formatKnowledgeBlock(domain?: string): string {
  try {
    if (circuitBreaker.isOpen("knowledge")) return "";
    if (!domain) return "";
    const results = IntegrationManager.retrieve({ query: "", domain, maxResults: 5 });
    circuitBreaker.reportSuccess("knowledge");
    if (!results || results.length === 0) return "";
    return results.map(r => `- ${r.content.slice(0, 200)}`).join("\n");
  } catch (e) {
    circuitBreaker.reportError("knowledge");
    return "";
  }
}

function formatOrgKnowledgeBlock(query: string): string {
  try {
    if (circuitBreaker.isOpen("orgKnowledge")) return "";

    const nodes = organizationalMemory.search(query);
    circuitBreaker.reportSuccess("orgKnowledge");
    if (nodes.length === 0) return "";

    return nodes.slice(0, 5).map(n =>
      `- ${n.content.slice(0, 200)} (confidence: ${n.confidence}%)`
    ).join("\n");
  } catch (e) {
    circuitBreaker.reportError("orgKnowledge");
    return "";
  }
}

function buildMemoryContext(
  query: MemoryQuery,
  blocks: { key: string; priority: number; content: string; maxTokens: number }[],
): MemoryContext {
  const maxTokens = query.maxTokens ?? memoryConfig.getExecutiveBudget(query.executive);
  const overhead = Math.floor(maxTokens * 0.1);
  const available = maxTokens - overhead;

  const result: MemoryContext = {
    recentDecisions: "",
    workingMemory: "",
    semanticMemory: "",
    episodicMemory: "",
    knowledgeContext: "",
    organizationalMemory: "",
    memoryEngineRecords: "",
    totalTokens: 0,
  };

  let used = 0;

  for (const block of blocks) {
    if (!block.content) continue;
    if (used + block.maxTokens > available) break;

    const truncated = truncateByTokens(block.content, block.maxTokens);
    const tokens = countTokens(truncated);

    if (used + tokens > available) break;

    (result as any)[block.key] = truncated;
    used += tokens;
  }

  result.totalTokens = used + overhead;
  return result;
}

// ── Main Read ──

async function read(query: MemoryQuery): Promise<MemoryContext> {
  if (!memoryConfig.enabled) {
    return {
      recentDecisions: "", workingMemory: "", semanticMemory: "",
      episodicMemory: "", knowledgeContext: "", organizationalMemory: "",
      memoryEngineRecords: "", totalTokens: 0,
    };
  }

  const cacheKey = { executive: query.executive, domain: query.domain ?? "general", scope: query.memoryScope, query: query.query };

  // L2: Redis cache
  const redis = getRedisCache();
  if (redis) {
    const redisKey = `memory:${query.executive}:${query.domain ?? "general"}:${query.memoryScope}:${cacheKey.query.slice(0, 32)}`;
    const cached = await redis.get<MemoryContext>(redisKey);
    if (cached) { memoryMetrics.recordL2Hit(); memoryMetrics.maybeLog(); return cached; }
    memoryMetrics.recordL2Miss();
  }

  // L1: In-memory cache
  const l1Cached = l1Cache.get(cacheKey.executive, cacheKey.domain ?? "general", cacheKey.scope, cacheKey.query);
  if (l1Cached) { memoryMetrics.recordL1Hit(); memoryMetrics.maybeLog(); return l1Cached; }
  memoryMetrics.recordL1Miss();

  // ── Parallel read from all stores ──
  const maxTokens = query.maxTokens ?? memoryConfig.getExecutiveBudget(query.executive);

  const timeout = (ms: number): Promise<never> =>
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

  const withTimeout = <T>(p: Promise<T>, store: string): Promise<T> =>
    Promise.race([p, timeout(memoryConfig.getStoreTimeout(store))]).catch(() => (null as unknown as T));

  const decisionsLimit = query.executive === "CEO" || query.executive === "CKO" ? 10
    : query.executive === "CTO" || query.executive === "CAIO" ? 5
    : 3;

  const readStart = Date.now();
  const [workingStr, decisionsStr, semanticStr, episodicStr, knowledgeStr, orgStr, memoryEngineStr] = await Promise.all([
    withTimeout(Promise.resolve(formatWorkingMemoryBlock(query.executive)), "working"),
    withTimeout(Promise.resolve(formatDecisionsBlock(query.executive, decisionsLimit)), "decisions"),
    withTimeout(Promise.resolve(formatSemanticMemoryBlock(query.query)), "semantic"),
    withTimeout(Promise.resolve(formatEpisodicMemoryBlock(query.query)), "episodic"),
    withTimeout(Promise.resolve(formatKnowledgeBlock(query.domain)), "knowledge"),
    withTimeout(
      Promise.resolve(query.memoryScope === "organization" ? formatOrgKnowledgeBlock(query.query) : ""),
      "orgKnowledge",
    ),
    withTimeout(Promise.resolve(query.includeMemoryEngine !== false ? formatMemoryEngineRecords(query) : ""), "memoryEngine"),
  ]);

  const stores = ["working", "decisions", "semantic", "episodic", "knowledge", "orgKnowledge", "memoryEngine"];
  const results = [workingStr, decisionsStr, semanticStr, episodicStr, knowledgeStr, orgStr, memoryEngineStr];
  for (let i = 0; i < stores.length; i++) {
    const err = results[i] === null;
    memoryMetrics.recordStoreRead(stores[i], Date.now() - readStart, err);
  }

  const blocks = [
    { key: "workingMemory", priority: 1, content: workingStr ? `## Working Memory\n${workingStr}` : "", maxTokens: 200 },
    { key: "recentDecisions", priority: 2, content: decisionsStr ? `## Past Decisions\n${decisionsStr}` : "", maxTokens: 500 },
    { key: "memoryEngineRecords", priority: 2, content: memoryEngineStr ? `## Memory Engine Records\n${memoryEngineStr}` : "", maxTokens: 400 },
    { key: "episodicMemory", priority: 3, content: episodicStr ? `## Episodic Memory\n${episodicStr}` : "", maxTokens: 300 },
    { key: "knowledgeContext", priority: 4, content: knowledgeStr ? `## Knowledge Context\n${knowledgeStr}` : "", maxTokens: 300 },
    { key: "semanticMemory", priority: 5, content: semanticStr ? `## Semantic Memory\n${semanticStr}` : "", maxTokens: 150 },
    { key: "organizationalMemory", priority: 6, content: orgStr ? `## Organizational Knowledge\n${orgStr}` : "", maxTokens: 300 },
  ].filter(b => b.content);

  blocks.sort((a, b) => a.priority - b.priority);

  const context = buildMemoryContext(query, blocks);

  // Record metrics
  memoryMetrics.recordRead(query.executive, Date.now() - readStart, false);
  memoryMetrics.maybeLog();

  // Cache results
  l1Cache.set(cacheKey.executive, cacheKey.domain ?? "general", cacheKey.scope, cacheKey.query, context);

  if (redis) {
    const ttlMap: Record<string, number> = { decisions: 120, episodic: 300, knowledge: 600, orgKnowledge: 3600 };
    const highestTtl = Math.max(...Object.values(ttlMap), 60);
    const redisKey = `memory:${query.executive}:${query.domain ?? "general"}:${query.memoryScope}:${cacheKey.query.slice(0, 32)}`;
    await redis.set(redisKey, context, highestTtl);
    memoryMetrics.recordL2Miss();
  }

  return context;
}

// ── Estimate ──

function estimate(query: MemoryQuery): { tokens: number; sources: string[] } {
  const sources: string[] = [];
  let tokens = 0;

  const includeDecisions = query.includeDecisions ?? true;
  const includeWorking = query.includeWorking ?? true;
  const includeSemantic = query.includeSemantic ?? hasTemporalReference(query.query);
  const includeEpisodic = query.includeEpisodic ?? true;
  const includeOrgKnowledge = query.includeOrgKnowledge ?? false;

  if (includeWorking) { sources.push("working"); tokens += 200; }
  if (includeDecisions) { sources.push("decisions"); tokens += 500; }
  if (includeEpisodic) { sources.push("episodic"); tokens += 300; }
  if (query.domain) { sources.push("knowledge"); tokens += 300; }
  if (includeSemantic) { sources.push("semantic"); tokens += 150; }
  if (includeOrgKnowledge || query.memoryScope === "organization") { sources.push("orgKnowledge"); tokens += 300; }
  if (query.includeMemoryEngine !== false) { sources.push("memoryEngine"); tokens += 400; }

  const maxTokens = query.maxTokens ?? memoryConfig.getExecutiveBudget(query.executive);
  return { tokens: Math.min(tokens, maxTokens), sources };
}

// ── Memory Engine Integration (EPIC T.1) ──

const memoryEngine = new MemoryEngine();

async function write(input: WriteMemoryInput): Promise<WriteMemoryResult> {
  const record = memoryEngine.write({
    content: input.content,
    category: (input.category as any) ?? "fact",
    scope: (input.scope as any) ?? "GLOBAL",
    owner: input.executive,
    source: input.source ?? "executive",
    tags: input.tags ?? [],
    confidence: input.confidence ?? 1.0,
    executivePriority: input.executivePriority ?? 50,
    isUserExplicit: input.isUserExplicit ?? false,
  });

  memoryMetrics.recordRead(input.executive, 0, false);
  memoryMetrics.maybeLog();

  return {
    id: record.id,
    importanceScore: record.importance.total,
    state: record.lifecycleState,
  };
}

export { memoryEngine };

// T.2 — Expose MemoryEngine records for evidence/reasoning integration
function formatMemoryEngineRecords(query: MemoryQuery): string {
  try {
    const records = memoryEngine.query({
      scope: (query.executive.toUpperCase() === "CEO" || query.executive === "CKO" ? "GLOBAL" : query.executive) as any,
      limit: 10,
    });
    if (records.length === 0) return "";
    return records.slice(0, 10).map((r, i) => {
      const imp = r.importance.total;
      const state = r.lifecycleState;
      return `${i + 1}. [${imp}] ${r.content.slice(0, 200)} (${state})`;
    }).join("\n");
  } catch {
    return "";
  }
}

export const memoryProvider: IMemoryProvider = { read, write, estimate };
