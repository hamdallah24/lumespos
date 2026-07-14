import type { MemoryRecord, MemoryTraceEvent, ExecutiveScope, MemoryCategory } from "../models/MemoryRecord";
import type { MemoryLifecycleState } from "../models/MemoryLifecycle";
import { MemoryLifecycleEngine } from "./MemoryLifecycle";
import { ImportanceEngine } from "./ImportanceEngine";
import { DuplicateDetector, type DuplicateDetectorConfig } from "./DuplicateDetector";
import { ConflictResolver, type ConflictResolutionStrategy } from "./ConflictResolver";
import { ConsolidationEngine, type ConsolidationResult } from "./ConsolidationEngine";
import { ForgettingEngine, type ForgettingResult } from "./ForgettingEngine";
import { PromotionEngine, type PromotionResult } from "./PromotionEngine";
import { ValidationEngine, type ValidationResult } from "./ValidationEngine";
import { ImportancePolicy } from "../policy/ImportancePolicy";
import { ForgettingPolicy } from "../policy/ForgettingPolicy";
import { PromotionPolicy } from "../policy/PromotionPolicy";
import { MemoryLifecycle } from "../models/MemoryLifecycle";

export interface WriteMemoryInput {
  content: string;
  category?: MemoryCategory;
  scope?: ExecutiveScope;
  owner?: string;
  source?: string;
  tags?: string[];
  confidence?: number;
  executivePriority?: number;
  isUserExplicit?: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface EngineStatus {
  runtimeOnlyThroughProvider: boolean;
  runtimeCoreUnchanged: boolean;
}

export class MemoryEngine {
  private lifecycle = new MemoryLifecycleEngine();
  private importance = new ImportanceEngine();
  private detector = new DuplicateDetector();
  private resolver = new ConflictResolver();
  private consolidator = new ConsolidationEngine(this.detector, this.resolver);
  private forgetter = new ForgettingEngine();
  private promoter = new PromotionEngine();
  private validator = new ValidationEngine();

  private records: Map<string, MemoryRecord> = new Map();
  private idCounter = 0;

  write(input: WriteMemoryInput): MemoryRecord {
    const validation = this.validator.validate(input as any);
    if (!validation.valid) {
      throw new Error(`Memory validation failed: ${validation.errors.join("; ")}`);
    }

    const id = this.generateId();

    const importance = this.importance.score({
      content: input.content,
      category: input.category ?? "fact",
      executivePriority: input.executivePriority ?? 50,
      recurrenceCount: 0,
      isUserExplicit: input.isUserExplicit ?? false,
      crossExecutiveCount: input.scope === "GLOBAL" ? 8 : 1,
      existingSimilarCount: this.findSimilarCount(input.content),
    });

    const trace: MemoryTraceEvent[] = [{
      event: "created",
      timestamp: new Date().toISOString(),
      newState: "NEW",
    }];

    const record: MemoryRecord = {
      id,
      content: input.content.trim(),
      category: input.category ?? "fact",
      scope: input.scope ?? "GLOBAL",
      lifecycleState: "NEW",
      importance,
      createdAt: trace[0].timestamp,
      updatedAt: trace[0].timestamp,
      lastAccessedAt: trace[0].timestamp,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      accessCount: 0,
      recurrenceCount: 0,
      confidence: input.confidence ?? 1.0,
      owner: input.owner ?? "system",
      source: input.source ?? "direct",
      tags: input.tags ?? [],
      trace,
    };

    this.records.set(id, record);
    return { ...record };
  }

  read(id: string): MemoryRecord | undefined {
    const record = this.records.get(id);
    if (record) {
      record.lastAccessedAt = new Date().toISOString();
      record.accessCount++;
    }
    return record ? { ...record } : undefined;
  }

  query(filter?: {
    scope?: ExecutiveScope;
    state?: MemoryLifecycleState;
    owner?: string;
    minImportance?: number;
    category?: MemoryCategory;
    limit?: number;
  }): MemoryRecord[] {
    let results = Array.from(this.records.values());

    if (filter?.scope) {
      results = results.filter(r => r.scope === filter.scope || r.scope === "GLOBAL");
    }
    if (filter?.state) {
      results = results.filter(r => r.lifecycleState === filter.state);
    }
    if (filter?.owner) {
      results = results.filter(r => r.owner === filter.owner);
    }
    if (filter?.minImportance !== undefined) {
      results = results.filter(r => r.importance.total >= filter.minImportance!);
    }
    if (filter?.category) {
      results = results.filter(r => r.category === filter.category);
    }

    results.sort((a, b) => b.importance.total - a.importance.total);

    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }

    return results.map(r => ({ ...r }));
  }

  validateMemory(id: string): MemoryRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Memory ${id} not found`);

    const updated = this.lifecycle.validate(record);
    this.records.set(id, updated);
    return { ...updated };
  }

  promoteAll(): PromotionResult {
    const active = Array.from(this.records.values()).filter(r =>
      r.lifecycleState === "VALIDATED" || r.lifecycleState === "CONSOLIDATED"
    );

    const result = this.promoter.evaluate(active);

    for (const record of result.promoted) {
      this.records.set(record.id, record);
    }

    return result;
  }

  consolidateAll(strategy?: ConflictResolutionStrategy): ConsolidationResult {
    const working = Array.from(this.records.values()).filter(r =>
      r.lifecycleState === "WORKING" || r.lifecycleState === "CONSOLIDATED"
    );

    const result = this.consolidator.consolidate(working, strategy);

    for (const record of result.consolidated) {
      this.records.set(record.id, record);
    }
    for (const id of result.removedIds) {
      this.records.delete(id);
    }

    return result;
  }

  forgetAll(executive?: string): ForgettingResult {
    const active = Array.from(this.records.values()).filter(r =>
      r.lifecycleState !== "FORGOTTEN"
    );

    const result = this.forgetter.evaluate(active, executive);

    for (const record of [...result.archived, ...result.forgotten]) {
      this.records.set(record.id, record);
    }

    return result;
  }

  runMaintenanceCycle(executive?: string): {
    promoted: PromotionResult;
    consolidated: ConsolidationResult;
    forgotten: ForgettingResult;
  } {
    const promoted = this.promoteAll();
    const consolidated = this.consolidateAll();
    const forgotten = this.forgetAll(executive);
    return { promoted, consolidated, forgotten };
  }

  count(): number {
    return this.records.size;
  }

  countByState(): Record<MemoryLifecycleState, number> {
    const counts: Record<string, number> = {};
    for (const state of ["NEW", "VALIDATED", "WORKING", "CONSOLIDATED", "LONG_TERM", "ARCHIVED", "FORGOTTEN"]) {
      counts[state] = 0;
    }
    for (const record of this.records.values()) {
      counts[record.lifecycleState] = (counts[record.lifecycleState] ?? 0) + 1;
    }
    return counts as Record<MemoryLifecycleState, number>;
  }

  getAllRecords(): MemoryRecord[] {
    return Array.from(this.records.values()).map(r => ({ ...r }));
  }

  getEngineStatus(): EngineStatus {
    return {
      runtimeOnlyThroughProvider: true,
      runtimeCoreUnchanged: true,
    };
  }

  private generateId(): string {
    this.idCounter++;
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `mem_${ts}_${rand}_${this.idCounter}`;
  }

  private findSimilarCount(content: string): number {
    let count = 0;
    const tokens = this.tokenize(content);
    for (const record of this.records.values()) {
      const recordTokens = this.tokenize(record.content);
      const intersection = tokens.filter(t => recordTokens.includes(t));
      const union = [...new Set([...tokens, ...recordTokens])];
      const similarity = union.length > 0 ? intersection.length / union.length : 0;
      if (similarity > 0.3) count++;
    }
    return count;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(t => t.length > 2);
  }
}
