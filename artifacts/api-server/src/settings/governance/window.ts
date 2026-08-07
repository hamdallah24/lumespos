// ConfigCenter — Milestone 5 Phase 3: Maintenance Window Registry.
// Operational governance — declares allowed change windows (recurring by
// day+time, or one-off by timestamp) and answers "is now inside / what is
// next". Derived from the clock at evaluation time. Consumer-only.

export type WindowKind = "recurring" | "one-off";

export interface WindowDefinition {
  id: string;
  name: string;
  kind: WindowKind;
  /** Recurring: days of week (Date#getDay: 0=Sun..6=Sat) + minutes from midnight. */
  days?: number[];
  startMinute?: number;
  endMinute?: number;
  /** One-off: absolute window bounds (ms). */
  from?: number;
  to?: number;
  createdAt: number;
  createdBy: string;
}

export class MaintenanceWindowRegistry {
  private windows = new Map<string, WindowDefinition>();
  private counter = 0;

  private nextId(now: number): string {
    this.counter += 1;
    return `win-${this.counter.toString(36)}-${now.toString(36)}`;
  }

  create(input: {
    name: string;
    kind: WindowKind;
    days?: number[];
    startMinute?: number;
    endMinute?: number;
    from?: number;
    to?: number;
    actor: string;
    now?: number;
  }): WindowDefinition {
    const now = input.now ?? Date.now();
    const win: WindowDefinition = {
      id: this.nextId(now),
      name: input.name,
      kind: input.kind,
      days: input.kind === "recurring" && input.days ? [...input.days] : undefined,
      startMinute: input.kind === "recurring" ? input.startMinute : undefined,
      endMinute: input.kind === "recurring" ? input.endMinute : undefined,
      from: input.kind === "one-off" ? input.from : undefined,
      to: input.kind === "one-off" ? input.to : undefined,
      createdAt: now,
      createdBy: input.actor,
    };
    this.windows.set(win.id, win);
    return win;
  }

  remove(id: string): boolean {
    return this.windows.delete(id);
  }

  get(id: string): WindowDefinition | undefined {
    const win = this.windows.get(id);
    return win ? { ...win } : undefined;
  }

  list(): WindowDefinition[] {
    return [...this.windows.values()].map((w) => ({ ...w }));
  }

  /** The active window at `now` (first match), else null. */
  activeAt(now: number): WindowDefinition | null {
    return this.list().find((w) => this.contains(w, now)) ?? null;
  }

  within(now: number): boolean {
    return this.activeAt(now) != null;
  }

  /** Start timestamp of the next active window after `now` (null if none). */
  nextAt(now: number): number | null {
    let best: number | null = null;
    for (const w of this.list()) {
      const start = this.nextStart(w, now);
      if (start != null && (best == null || start < best)) best = start;
    }
    return best;
  }

  private contains(w: WindowDefinition, now: number): boolean {
    if (w.kind === "one-off") {
      if (w.from == null || w.to == null) return false;
      return now >= w.from && now < w.to;
    }
    // recurring
    if (w.startMinute == null || w.endMinute == null || !w.days || w.days.length === 0) return false;
    const d = new Date(now);
    const day = d.getDay();
    const minute = d.getHours() * 60 + d.getMinutes();
    if (!w.days.includes(day)) return false;
    // windows that cross midnight: endMinute < startMinute
    if (w.startMinute <= w.endMinute) return minute >= w.startMinute && minute < w.endMinute;
    return minute >= w.startMinute || minute < w.endMinute;
  }

  private nextStart(w: WindowDefinition, now: number): number | null {
    if (w.kind === "one-off") return w.from != null && w.from > now ? w.from : null;
    if (w.startMinute == null || !w.days || w.days.length === 0) return null;
    const d = new Date(now);
    for (let offset = 0; offset <= 7; offset += 1) {
      const probe = new Date(now);
      probe.setDate(d.getDate() + offset);
      probe.setHours(0, 0, 0, 0);
      const day = probe.getDay();
      if (!w.days.includes(day)) continue;
      const start = probe.getTime() + w.startMinute * 60_000;
      if (start > now) return start;
    }
    return null;
  }
}