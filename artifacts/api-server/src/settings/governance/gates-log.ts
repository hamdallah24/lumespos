// ConfigCenter — Milestone 5 Phase 3: Governance Gate Log (append-only audit).
// Immutable record of operational-governance actions: freeze create/revoke,
// window create/remove, and emergency (break-glass) overrides. Append-only —
// no update, no overwrite, no delete. Provides the "full audit" for overrides.

export type GateEventType =
  | "freeze.created"
  | "freeze.revoked"
  | "window.created"
  | "window.removed"
  | "break-glass";

export interface GateRecord {
  seq: number;
  type: GateEventType;
  at: number;
  actor: string;
  scope?: Record<string, unknown>;
  data: Record<string, unknown>;
}

export interface GateRecordInput {
  type: GateEventType;
  at: number;
  actor: string;
  scope?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export class GovernanceGateLog {
  private records: GateRecord[] = [];
  private seq = 0;

  append(input: GateRecordInput): GateRecord {
    const record: GateRecord = Object.freeze({
      seq: ++this.seq,
      type: input.type,
      at: input.at,
      actor: input.actor,
      scope: input.scope ? { ...input.scope } : undefined,
      data: input.data ? { ...input.data } : {},
    });
    this.records.push(record);
    return record;
  }

  all(): readonly GateRecord[] {
    return this.records.slice();
  }

  byType(type: GateEventType): readonly GateRecord[] {
    return this.records.filter((r) => r.type === type);
  }
}