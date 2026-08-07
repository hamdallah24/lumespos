// ConfigCenter — Milestone 6 Phase 4: Ecosystem Operational Journal.
// Append-only, immutable, correlation-aware, actor-aware operational event log
// for the ecosystem layer. Sequence numbers are monotonic; records are frozen on
// append and exposed by copy so callers can never mutate history. This is an
// in-memory operational audit trail — NOT a WORM/hash-chain enterprise audit
// (deferred). Bounded/retention-aware behavior applies when persistence is used.

import { isEcosystemEventType } from "./journal-types";
import type { EcosystemEventType, EcosystemJournalEvent, EcosystemJournalEventInput } from "./types";

export interface EcosystemJournalOptions {
  now?: () => number;
  /** Optional retention cap. When exceeded, the oldest records are evicted. */
  maxEntries?: number;
}

export class EcosystemJournal {
  private readonly records: EcosystemJournalEvent[] = [];
  private readonly now: () => number;
  private readonly maxEntries?: number;
  private nextSeq = 1;

  constructor(options: EcosystemJournalOptions = {}) {
    this.now = options.now ?? Date.now;
    this.maxEntries = options.maxEntries;
  }

  /** Append an event. Returns the frozen record. Throws on invalid event type. */
  append(input: EcosystemJournalEventInput): EcosystemJournalEvent {
    if (!isEcosystemEventType(input.type)) {
      throw new Error(`[ecosystem.journal] unknown event type: ${String(input.type)}`);
    }
    if (typeof input.package !== "string" || input.package.length === 0) {
      throw new Error("[ecosystem.journal] event package is required");
    }
    const record: EcosystemJournalEvent = Object.freeze({
      seq: this.nextSeq,
      type: input.type,
      package: input.package,
      version: input.version,
      timestamp: this.now(),
      correlationId: input.correlationId,
      actor: input.actor,
      detail: input.detail,
      affectedDependents: input.affectedDependents ? [...input.affectedDependents] : undefined,
    });
    this.nextSeq += 1;
    this.records.push(record);
    if (this.maxEntries != null && this.records.length > this.maxEntries) {
      this.records.splice(0, this.records.length - this.maxEntries);
    }
    return record;
  }

  /** Read-only list (newest last, chronological). Each record is a frozen copy. */
  list(): readonly EcosystemJournalEvent[] {
    return this.records.map((r) => Object.freeze({ ...r, affectedDependents: r.affectedDependents ? [...r.affectedDependents] : undefined }));
  }

  /** Events for one package (chronological). */
  byPackage(packageName: string): readonly EcosystemJournalEvent[] {
    return this.list().filter((e) => e.package === packageName);
  }

  /** Events correlated to one operation (chronological). */
  byCorrelation(correlationId: string): readonly EcosystemJournalEvent[] {
    return this.list().filter((e) => e.correlationId === correlationId);
  }

  /** Events of one type (chronological). */
  byType(type: EcosystemEventType): readonly EcosystemJournalEvent[] {
    return this.list().filter((e) => e.type === type);
  }

  /** Total record count. */
  size(): number {
    return this.records.length;
  }
}
