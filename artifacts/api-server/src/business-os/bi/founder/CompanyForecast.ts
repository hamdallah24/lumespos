import type { KPIValue, ForecastResult } from "../types";

export class CompanyForecast {
  private extractForecast(
    fc: ForecastResult[],
    metric: string,
    dim: string,
    field: 'forecast7d' | 'forecast30d' | 'forecast90d' | 'forecast365d',
  ): number {
    return fc.find((f) => f.metric === metric && f.dimension === dim)?.[field] ?? 0;
  }

  private collectRisks(fc: ForecastResult[]): string[] {
    const risks: string[] = [];
    for (const f of fc) {
      for (const w of f.warnings ?? []) {
        risks.push(w);
      }
    }
    return [...new Set(risks)];
  }

  private sumKPI(kpis: KPIValue[], dim: string, metric?: string): number {
    return kpis
      .filter((k) => k.dimension === dim && (!metric || k.kpiName === metric))
      .reduce((s, k) => s + k.value, 0);
  }

  get30DayForecast(
    kpis: KPIValue[],
    forecastResults: ForecastResult[],
  ): { revenue: number; cash: number; profit: number; risks: string[] } {
    const revenue = this.extractForecast(forecastResults, 'revenue', 'finance', 'forecast30d')
      || this.sumKPI(kpis, 'finance', 'revenue');
    const cash = this.extractForecast(forecastResults, 'cash', 'finance', 'forecast30d')
      || this.sumKPI(kpis, 'finance', 'cash');
    const profit = this.extractForecast(forecastResults, 'profit', 'finance', 'forecast30d')
      || this.sumKPI(kpis, 'finance', 'profit');
    return { revenue, cash, profit, risks: this.collectRisks(forecastResults) };
  }

  get90DayForecast(
    kpis: KPIValue[],
    forecastResults: ForecastResult[],
  ): { revenue: number; cash: number; profit: number; risks: string[] } {
    const revenue = this.extractForecast(forecastResults, 'revenue', 'finance', 'forecast90d')
      || this.sumKPI(kpis, 'finance', 'revenue') * 3;
    const cash = this.extractForecast(forecastResults, 'cash', 'finance', 'forecast90d')
      || this.sumKPI(kpis, 'finance', 'cash') * 3;
    const profit = this.extractForecast(forecastResults, 'profit', 'finance', 'forecast90d')
      || this.sumKPI(kpis, 'finance', 'profit') * 3;
    return { revenue, cash, profit, risks: this.collectRisks(forecastResults) };
  }

  get365DayForecast(
    kpis: KPIValue[],
    forecastResults: ForecastResult[],
  ): { revenue: number; cash: number; profit: number; growth: number; risks: string[] } {
    const revenue = this.extractForecast(forecastResults, 'revenue', 'finance', 'forecast365d')
      || this.sumKPI(kpis, 'finance', 'revenue') * 12;
    const cash = this.extractForecast(forecastResults, 'cash', 'finance', 'forecast365d')
      || this.sumKPI(kpis, 'finance', 'cash') * 12;
    const profit = this.extractForecast(forecastResults, 'profit', 'finance', 'forecast365d')
      || this.sumKPI(kpis, 'finance', 'profit') * 12;
    const currentRevenue = this.sumKPI(kpis, 'finance', 'revenue') || 1;
    const growth = ((revenue - currentRevenue) / currentRevenue) * 100;
    return { revenue, cash, profit, growth, risks: this.collectRisks(forecastResults) };
  }
}
