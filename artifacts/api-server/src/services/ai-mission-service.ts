// ECP-047: Mission Service — CRUD + snapshot + live streaming
// State management via mission-engine.ts (SSOT — MISSION_LIFECYCLE.md)
import { EventEmitter } from "events";
import { db, missionsTable, missionSnapshotsTable } from "@workspace/db";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { missionRuntime } from "../ai/runtime/mission-engine";
import type { MissionState } from "../ai/runtime/mission-engine";

export type MissionLifecycle = MissionState;

interface MissionEvent {
  type: "snapshot" | "status_change" | "completed" | "error";
  missionId: number;
  data: any;
}

class AiMissionService {
  private emitter = new EventEmitter();
  private subs = new Map<string, Set<(ev: MissionEvent) => void>>();

  // ── CRUD ──

  async create(userId: number, title: string, objective: string, mode = "cto", complexity = "medium"): Promise<number> {
    const [m] = await db.insert(missionsTable).values({ userId, title, objective, mode, complexity, status: "CREATED" }).returning({ id: missionsTable.id });
    return m.id;
  }

  async getById(id: number) {
    const rows = await db.select().from(missionsTable).where(eq(missionsTable.id, id)).limit(1);
    return rows[0] || null;
  }

  async list(userId: number, limit = 20) {
    return db.select().from(missionsTable)
      .where(eq(missionsTable.userId, userId))
      .orderBy(desc(missionsTable.createdAt))
      .limit(limit);
  }

  async listActive(userId: number) {
    return db.select().from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), sql`${missionsTable.status} IN ('CREATED','UNDERSTANDING','PLANNING','DELEGATED','RUNNING','WAITING','REVIEW')`))
      .orderBy(desc(missionsTable.createdAt));
  }

  async transition(id: number, toStatus: MissionLifecycle, extra?: Partial<{
    progress: number; strategy: string; currentGoal: string;
    evidenceQuality: number; confidence: number; cyclesExecuted: number;
    result: string; error: string;
  }>) {
    const mission = await this.getById(id);
    if (!mission) return;
    // Validasi state via mission-engine.ts (SSOT — MISSION_LIFECYCLE.md)
    if (!missionRuntime.isValidTransition(mission.status as any, toStatus as any)) {
      console.warn(`[MissionService] Invalid transition: ${mission.status} → ${toStatus} (id=${id})`);
      return;
    }
    const vals: any = { status: toStatus, updatedAt: new Date() };
    if (extra) Object.assign(vals, extra);
    if (toStatus === "COMPLETED" || toStatus === "FAILED" || toStatus === "CANCELLED") vals.completedAt = new Date();
    await db.update(missionsTable).set(vals).where(eq(missionsTable.id, id));
    this.emit({ type: "status_change", missionId: id, data: { status: toStatus, ...extra } });
  }

  // ── Snapshots ──

  async saveSnapshot(id: number, cycle: number, data: {
    strategy?: string; stage?: string; progress?: number; currentGoal?: string;
    toolCalls?: any[]; evidenceQuality?: number; confidence?: number; metrics?: any;
  }) {
    await db.insert(missionSnapshotsTable).values({ missionId: id, cycle, ...data });
    this.emit({ type: "snapshot", missionId: id, data: { cycle, ...data } });
  }

  async getSnapshots(missionId: number) {
    return db.select().from(missionSnapshotsTable)
      .where(eq(missionSnapshotsTable.missionId, missionId))
      .orderBy(asc(missionSnapshotsTable.cycle));
  }

  // ── Live Streaming (pub/sub) ──

  subscribe(missionId: number, cb: (ev: MissionEvent) => void): () => void {
    const key = String(missionId);
    if (!this.subs.has(key)) this.subs.set(key, new Set());
    this.subs.get(key)!.add(cb);
    return () => { this.subs.get(key)?.delete(cb); };
  }

  notifyCompleted(missionId: number, result: string, summary: string): void {
    this.emit({ type: "completed", missionId, data: { result, summary } });
  }

  private emit(ev: MissionEvent) {
    const key = String(ev.missionId);
    this.subs.get(key)?.forEach(cb => { try { cb(ev); } catch {} });
    this.subs.get("__all__")?.forEach(cb => { try { cb(ev); } catch {} });
  }

  subscribeAll(cb: (ev: MissionEvent) => void): () => void {
    if (!this.subs.has("__all__")) this.subs.set("__all__", new Set());
    this.subs.get("__all__")!.add(cb);
    return () => { this.subs.get("__all__")?.delete(cb); };
  }
}

export const aiMissionService = new AiMissionService();
