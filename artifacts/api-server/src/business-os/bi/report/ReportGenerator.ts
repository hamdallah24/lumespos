import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight, BenchmarkResult, CompanySnapshot } from "../types";
import { DailyReport } from "./DailyReport";
import { WeeklyReport } from "./WeeklyReport";
import { MonthlyReport } from "./MonthlyReport";
import { QuarterlyReport } from "./QuarterlyReport";
import { YearlyReport } from "./YearlyReport";
import { PDFExporter } from "./PDFExporter";
import { MarkdownExporter } from "./MarkdownExporter";

type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export class ReportGenerator {
  daily = new DailyReport();
  weekly = new WeeklyReport();
  monthly = new MonthlyReport();
  quarterly = new QuarterlyReport();
  yearly = new YearlyReport();
  pdf = new PDFExporter();
  markdown = new MarkdownExporter();

  protected getReport(period: Period) {
    const map: Record<Period, { generate(...args: any[]): string }> = {
      daily: this.daily,
      weekly: this.weekly,
      monthly: this.monthly,
      quarterly: this.quarterly,
      yearly: this.yearly,
    };
    return map[period];
  }

  generate(
    period: Period,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    health: HealthScoreResult,
    narratives: NarrativeInsight[] = []
  ): string {
    const report = this.getReport(period);
    if (period === "daily") {
      return (report as DailyReport).generate(kpis, alerts, forecast, health);
    }
    return (report as WeeklyReport).generate(kpis, alerts, forecast, health, narratives);
  }

  generateAsMarkdown(
    period: Period,
    title: string,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    health: HealthScoreResult,
    narratives: NarrativeInsight[] = []
  ): string {
    const content = this.generate(period, kpis, alerts, forecast, health, narratives);
    return this.markdown.export(title, [
      { title: `${period.charAt(0).toUpperCase() + period.slice(1)} Report`, content, level: 1 },
    ]);
  }

  generateAsPDF(
    period: Period,
    title: string,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    health: HealthScoreResult,
    narratives: NarrativeInsight[] = [],
    options?: { includeTimestamp?: boolean; includeWatermark?: boolean }
  ): string {
    const content = this.generate(period, kpis, alerts, forecast, health, narratives);
    return this.pdf.export(title, [{ title: `${period.charAt(0).toUpperCase() + period.slice(1)} Report`, content }], options);
  }
}
