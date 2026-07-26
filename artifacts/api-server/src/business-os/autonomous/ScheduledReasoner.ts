import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { eventBus } from "../../event-bus/EventBus";
import type { BaseEvent } from "../../event-bus/types";

interface ScheduleSlot {
  id: string;
  time: string;
  executive: string;
  title: string;
  description: string;
  daysOfWeek: number[];
  generateBrief: boolean;
  enabled: boolean;
}

const SCHEDULE: ScheduleSlot[] = [
  { id: "sched-daily-ceo",     time: "07:00", executive: "CEO",  title: "Daily Brief",           description: "Ringkasan harian perusahaan",         daysOfWeek: [1, 2, 3, 4, 5, 6, 7], generateBrief: true, enabled: true },
  { id: "sched-daily-coo",     time: "08:00", executive: "COO",  title: "Operational Review",    description: "Review operasional harian",           daysOfWeek: [1, 2, 3, 4, 5, 6],    generateBrief: true, enabled: true },
  { id: "sched-daily-cfo",     time: "07:30", executive: "CFO",  title: "Financial Review",      description: "Review keuangan harian",              daysOfWeek: [1, 2, 3, 4, 5],       generateBrief: true, enabled: true },
  { id: "sched-daily-cmo",     time: "08:30", executive: "CMO",  title: "Sales & Marketing Sync", description: "Sinkronisasi sales dan marketing",  daysOfWeek: [1, 2, 3, 4, 5],       generateBrief: true, enabled: true },
  { id: "sched-weekly-chro",   time: "09:00", executive: "CHRO", title: "HR Weekly Review",      description: "Review SDM mingguan",                 daysOfWeek: [1],                    generateBrief: true, enabled: true },
  { id: "sched-weekly-cto",    time: "10:00", executive: "CTO",  title: "Tech Weekly Sync",      description: "Sinkronisasi teknologi mingguan",     daysOfWeek: [1],                    generateBrief: true, enabled: true },
  { id: "sched-daily-cko",     time: "22:00", executive: "CKO",  title: "Knowledge Consolidation", description: "Konsolidasi pengetahuan harian",    daysOfWeek: [1, 2, 3, 4, 5, 6, 7], generateBrief: true, enabled: false },
  { id: "sched-daily-caio",    time: "23:00", executive: "CAIO", title: "AI Systems Review",     description: "Review sistem AI harian",              daysOfWeek: [1, 2, 3, 4, 5, 6, 7], generateBrief: true, enabled: false },
  { id: "sched-weekly-cfo-close", time: "17:00", executive: "CFO", title: "Financial Closing",   description: "Penutupan buku keuangan",             daysOfWeek: [5],                    generateBrief: true, enabled: true },
  { id: "sched-weekly-coo",    time: "07:00", executive: "COO",  title: "Weekly Ops Planning",   description: "Perencanaan operasional mingguan",    daysOfWeek: [1],                    generateBrief: true, enabled: true },
];

export class ScheduledReasoner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;
  private lastCheckedDate = "";
  public onBriefGenerated: ((slot: ScheduleSlot) => void) | null = null;

  start(): void {
    if (this.active) return;
    this.active = true;
    this.checkSchedule();
    this.timer = setInterval(() => this.checkSchedule(), 60 * 1000);
    console.log(`[ScheduledReasoner] Started with ${SCHEDULE.filter(s => s.enabled).length} active schedule slots`);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.active = false;
  }

  isActive(): boolean { return this.active; }
  getSchedule(): ScheduleSlot[] { return [...SCHEDULE]; }

  private checkSchedule(): void {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (today === this.lastCheckedDate) return;
    this.lastCheckedDate = today;

    const dayOfWeek = now.getDay() || 7;
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    for (const slot of SCHEDULE) {
      if (!slot.enabled) continue;
      if (!slot.daysOfWeek.includes(dayOfWeek)) continue;
      if (slot.time !== currentTime) continue;

      this.executeSlot(slot);
    }
  }

  private executeSlot(slot: ScheduleSlot): void {
    const ws = ExecutiveWorkspaceManager.getWorkspace(slot.executive);

    ws.timeline.push({
      id: `sched-${Date.now()}`,
      executive: slot.executive,
      type: "summary",
      title: slot.title,
      description: slot.description,
      timestamp: new Date().toISOString(),
      metadata: { scheduled: true, slotId: slot.id },
    } as any);

    if (slot.generateBrief) {
      const snapshot = ExecutiveWorkspaceManager.generateDailySnapshot(slot.executive);
      ws.snapshots.push(snapshot);
    }

    eventBus.publish({
      id: `sched-${slot.id}-${Date.now()}`,
      type: `schedule.${slot.executive.toLowerCase()}_${slot.id.split("-").pop()}`,
      version: 1, timestamp: new Date(),
      aggregateId: slot.executive, aggregateType: "executive",
      data: { slotId: slot.id, title: slot.title, executive: slot.executive, time: slot.time },
    } as BaseEvent);

    if (this.onBriefGenerated) this.onBriefGenerated(slot);

    console.log(`[ScheduledReasoner] Executed: ${slot.executive} — ${slot.title}`);
  }
}
