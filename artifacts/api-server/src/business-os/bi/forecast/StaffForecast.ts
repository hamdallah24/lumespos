export class StaffForecast {
  forecastHeadcount(
    currentHeadcount: number,
    turnoverRate: number,
    growthRate: number,
    months: number
  ): { month: number; headcount: number }[] {
    const result: { month: number; headcount: number }[] = [];
    let headcount = currentHeadcount;
    for (let m = 1; m <= months; m++) {
      const turnoverLoss = Math.round(headcount * (turnoverRate / 12));
      const growthHires = Math.round(headcount * (growthRate / 12));
      headcount = Math.max(0, headcount - turnoverLoss + growthHires);
      result.push({ month: m, headcount: Math.round(headcount) });
    }
    return result;
  }

  forecastHiringNeeds(
    currentHeadcount: number,
    targetHeadcount: number,
    turnoverRate: number,
    months: number
  ): number {
    const gap = targetHeadcount - currentHeadcount;
    if (gap <= 0) return 0;
    const totalTurnover = Math.round(currentHeadcount * (turnoverRate / 12) * months);
    const hiresForGrowth = gap;
    const hiresForAttrition = Math.max(0, totalTurnover);
    return Math.max(0, hiresForGrowth + hiresForAttrition);
  }

  getOptimalShiftStaff(workload: number[], serviceLevel: number): number {
    if (workload.length === 0) return 0;
    const totalWorkload = workload.reduce((a, b) => a + b, 0);
    const avgWorkload = totalWorkload / workload.length;
    const maxWorkload = Math.max(...workload);
    const buffer = maxWorkload > 0 ? maxWorkload / avgWorkload : 1;
    const baseStaff = Math.ceil(avgWorkload / serviceLevel);
    const optimalStaff = Math.ceil(baseStaff * Math.max(1, buffer * 0.3));
    return Math.max(1, optimalStaff);
  }
}
