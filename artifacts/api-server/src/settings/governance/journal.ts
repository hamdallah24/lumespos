// ConfigCenter — Milestone 5 Phase 2: Approval Journal (durable, append-only).
// Every governance transition is an IMMUTABLE record with a global sequence and
// a per-request monotonic version. Request state is DERIVED by replaying the
// journal — never stored in place as truth. This gives durability + audit
// without touching the config store (approval is authorization, not the source
// of truth for configuration).

export type ApprovalEventType =
  | "created"
  | "approved"
  | "rejected"
  | "cancelled"
  | "committed"
  | "expired";

export interface ApprovalRecord {
  /** Global monotonic sequence — immutable journal order. */
  seq: number;
  requestId: string;
  /** Per-request transition index — the optimistic-lock version. */
  version: number;
  type: ApprovalEventType;
  at: number;
  data: Record<string, unknown>;
}

export interface ApprovalRecordInput {
  requestId: string;
  type: ApprovalEventType;
  at: number;
  data?: Record<string, unknown>;
}

export class ApprovalJournal {
  private records: ApprovalRecord[] = [];
  private seq = 0;

  /** Append an immutable record and return the finalized (seq'd, frozen) version. */
  append(input: ApprovalRecordInput): ApprovalRecord {
    const version = this.versionOf(input.requestId) + 1;
    const record: ApprovalRecord = Object.freeze({
      seq: ++this.seq,
      requestId: input.requestId,
      version,
      type: input.type,
      at: input.at,
      data: input.data ? { ...input.data } : {},
    });
    this.records.push(record);
    return record;
  }

  /** All records for a request, in append order (replay source). */
  forRequest(requestId: string): readonly ApprovalRecord[] {
    return this.records.filter((r) => r.requestId === requestId);
  }

  /** Current transition count for a request (0 = none yet). */
  versionOf(requestId: string): number {
    let n = 0;
    for (const r of this.records) if (r.requestId === requestId) n += 1;
    return n;
  }

  /** Full journal (for queue / search / export). */
  all(): readonly ApprovalRecord[] {
    return this.records.slice();
  }
}