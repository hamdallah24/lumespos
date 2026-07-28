import type { ContextBuilder, BuildOptions, RawHRData, PeopleContext } from '../types';

interface CacheEntry {
  data: PeopleContext;
  expiresAt: number;
}

export class HRContextBuilder implements ContextBuilder<RawHRData, PeopleContext> {
  readonly domain = "hr";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `hr|b${options?.branchId ?? 0}`;
  }

  async build(input: RawHRData, options?: BuildOptions): Promise<PeopleContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const byDepartment = this.groupByDepartment(input.employees);
    const activeCount = input.employees.filter(e => e.status === "active" || e.status === "probation").length;
    const presentToday = input.attendance.filter(a => a.type === "check_in").length;
    const onLeaveToday = input.leave.filter(l => l.status === "approved").length;

    const context: PeopleContext = {
      headcount: {
        total: input.employees.length,
        active: activeCount,
        byDepartment,
      },
      attendance: {
        today: {
          present: presentToday,
          absent: Math.max(0, activeCount - presentToday - onLeaveToday),
          onLeave: onLeaveToday,
        },
        trend: presentToday > activeCount * 0.8 ? "good" : presentToday > activeCount * 0.6 ? "normal" : "low",
      },
      leave: {
        pending: input.leave.filter(l => l.status === "pending").length,
        approved: onLeaveToday,
        byType: this.groupLeaveByType(input.leave),
      },
      performance: {
        topPerformers: input.employees.filter(e => (e.rating ?? 0) >= 4.5).map(e => e.name),
        issues: input.employees.filter(e => (e.rating ?? 5) < 2.5).map(e => `${e.name} — perlu review performa`),
      },
      hiring: {
        openPositions: input.employees.filter(e => e.status === "candidate").length,
        candidates: 0,
        timeToHire: 0,
      },
      risks: this.assessRisks(input, activeCount),
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 120000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }

  private groupByDepartment(employees: RawHRData["employees"]): { department: string; count: number }[] {
    const map = new Map<string, number>();
    for (const e of employees) {
      const dept = e.department || "general";
      map.set(dept, (map.get(dept) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([department, count]) => ({ department, count }));
  }

  private groupLeaveByType(leave: RawHRData["leave"]): { type: string; count: number }[] {
    const map = new Map<string, number>();
    for (const l of leave) {
      map.set(l.type, (map.get(l.type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }

  private assessRisks(input: RawHRData, activeCount: number): PeopleContext["risks"] {
    const risks: PeopleContext["risks"] = [];
    const absentCount = input.attendance.filter(a => a.type !== "check_in").length;
    if (absentCount > activeCount * 0.2) {
      risks.push({ type: "attendance", severity: "high", description: `Tingkat absensi tinggi: ${absentCount} dari ${activeCount} karyawan` });
    }
    if (input.leave.filter(l => l.status === "pending").length > 5) {
      risks.push({ type: "leave_backlog", severity: "medium", description: "Ada >5 permintaan cuti yang perlu diproses" });
    }
    return risks;
  }
}
