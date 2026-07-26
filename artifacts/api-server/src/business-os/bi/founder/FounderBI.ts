import { BIContextBuilder } from "../context/BIContextBuilder";
import { ExecutiveBIAdapter } from "../context/ExecutiveBIAdapter";
import { FounderDashboard } from "../founder/FounderDashboard";
import { FounderNarrative } from "../narrative/FounderNarrative";
import { BIFeedbackEngine } from "../feedback/BIFeedbackEngine";
import type { BIContext } from "../context/BIContext";
import type { CompanySnapshot } from "../types";

export class FounderBI {
  private biBuilder: BIContextBuilder;
  private biAdapter: ExecutiveBIAdapter;
  private founderDashboard: FounderDashboard;
  private founderNarrative: FounderNarrative;
  private feedbackEngine: BIFeedbackEngine;

  constructor() {
    this.biBuilder = new BIContextBuilder();
    this.biAdapter = new ExecutiveBIAdapter();
    this.founderDashboard = new FounderDashboard();
    this.founderNarrative = new FounderNarrative();
    this.feedbackEngine = new BIFeedbackEngine();
  }

  async ask(question: string, workspaceData?: any): Promise<{
    answer: string;
    snapshot: CompanySnapshot | null;
    biContext: BIContext | null;
  }> {
    const bi = await this.biBuilder.build(workspaceData);
    const snapshot = this.founderDashboard.getFullDashboard(
      bi.kpis, bi.health, bi.forecasts, bi.narratives,
      {} as any,
    );

    const briefing = this.founderNarrative.generate(bi.narratives, { overall: bi.health.overall }, bi.forecasts);
    const formattedBriefing = this.founderNarrative.formatBriefing(briefing);

    let answer: string;

    if (question.toLowerCase().includes("kondisi") || question.toLowerCase().includes("keadaan") || question.toLowerCase().includes("bagaimana perusahaan")) {
      answer = this.answerCompanyCondition(bi, snapshot, formattedBriefing);
    } else if (question.toLowerCase().includes("sehat") || question.toLowerCase().includes("health")) {
      answer = this.answerHealth(bi);
    } else if (question.toLowerCase().includes("risiko") || question.toLowerCase().includes("risk")) {
      answer = this.answerRisks(bi);
    } else if (question.toLowerCase().includes("forecast") || question.toLowerCase().includes("prediksi") || question.toLowerCase().includes("masa depan")) {
      answer = this.answerForecast(bi);
    } else if (question.toLowerCase().includes("rekomendasi") || question.toLowerCase().includes("rekomendation")) {
      answer = this.answerRecommendations(bi);
    } else {
      answer = formattedBriefing;
    }

    return { answer, snapshot, biContext: bi };
  }

  async getCompanyBriefing(): Promise<string> {
    const bi = await this.biBuilder.build();
    const briefing = this.founderNarrative.generate(bi.narratives, { overall: bi.health.overall }, bi.forecasts);
    return this.founderNarrative.formatBriefing(briefing);
  }

  async getCompactView(): Promise<string> {
    const bi = await this.biBuilder.build();
    return this.founderDashboard.getCompactView(bi.kpis, bi.health);
  }

  private answerCompanyCondition(bi: BIContext, snapshot: CompanySnapshot, briefing: string): string {
    const lines: string[] = [];
    lines.push("Kondisi Perusahaan Saat Ini");
    lines.push("─".repeat(50));
    lines.push(`Health: ${bi.health.overall}/100`);
    lines.push(`Revenue: ${snapshot.revenue.month.toLocaleString()}/bulan`);
    lines.push(`Cash: ${snapshot.cash.position.toLocaleString()}`);
    lines.push(`Profit: ${snapshot.profit.month.toLocaleString()}`);
    lines.push("");
    if (bi.health.topRisks.length > 0) {
      lines.push("Risiko Utama:");
      for (const r of bi.health.topRisks.slice(0, 3)) {
        lines.push(`  • ${r.risk} (${r.severity})`);
      }
    }
    lines.push("");
    lines.push(briefing);
    return lines.join("\n");
  }

  private answerHealth(bi: BIContext): string {
    const lines: string[] = [];
    lines.push(`Company Health: ${bi.health.overall}/100`);
    lines.push("─".repeat(40));
    for (const d of bi.health.dimensions) {
      const icon = d.status === "healthy" ? "✓" : d.status === "warning" ? "~" : "✗";
      lines.push(`${icon} ${d.dimension.padEnd(15)} ${String(d.score).padStart(3)}/100 (${d.trend})`);
    }
    return lines.join("\n");
  }

  private answerRisks(bi: BIContext): string {
    const lines: string[] = ["Risiko Bisnis Saat Ini", "─".repeat(40)];
    for (const r of bi.health.topRisks) {
      lines.push(`• [${r.severity}] ${r.risk}`);
    }
    if (bi.health.topOpportunities.length > 0) {
      lines.push("", "Opportunities:", ...bi.health.topOpportunities.map(o => `  → ${o.opportunity}`));
    }
    return lines.join("\n");
  }

  private answerForecast(bi: BIContext): string {
    const lines: string[] = ["Business Forecast", "─".repeat(40)];
    for (const f of bi.forecasts.slice(0, 5)) {
      lines.push(`${f.metric}: 7d=${f.forecast7d}, 30d=${f.forecast30d}, 90d=${f.forecast90d}`);
      if (f.warnings.length > 0) lines.push(`  ⚠ ${f.warnings.join(", ")}`);
    }
    return lines.join("\n");
  }

  private answerRecommendations(bi: BIContext): string {
    const lines: string[] = ["Rekomendasi", "─".repeat(40)];
    for (const r of bi.recommendations.slice(0, 5)) {
      lines.push(`[${r.priority}] ${r.recommendation}`);
      lines.push(`  → ${r.impact}`);
    }
    return lines.join("\n");
  }

  getFeedbackSummary(): string {
    const feedback = this.feedbackEngine.getFounderFeedbackSummary();
    const lines: string[] = [];
    lines.push("Executive & BI Feedback Dashboard");
    lines.push("═".repeat(50));
    lines.push("");
    lines.push("Executive Accuracy:");
    for (const ea of feedback.executiveAccuracy) {
      const icon = ea.successRate >= 70 ? "✓" : ea.successRate >= 40 ? "~" : "✗";
      lines.push(`  ${icon} ${ea.executive.padEnd(6)} ${ea.successRate.toFixed(1)}% success, ${(ea.avgConfidence * 100).toFixed(0)}% avg conf (${ea.trend})`);
    }
    lines.push("");
    lines.push(`Forecast Accuracy: ${feedback.forecastAccuracy.toFixed(1)}%`);
    lines.push(`Recommendation Score: ${(feedback.recommendationScore * 100).toFixed(0)}%`);
    lines.push("");
    lines.push(`Best Strategy: ${feedback.bestStrategy}`);
    lines.push(`Worst Strategy: ${feedback.worstStrategy}`);
    lines.push("");
    lines.push(`Top Failure Pattern: ${feedback.topFailurePattern}`);
    lines.push(`Top Success Pattern: ${feedback.topSuccessPattern}`);
    lines.push("");
    lines.push("─".repeat(50));
    return lines.join("\n");
  }

  getFeedbackForFounder(feedback: ReturnType<BIFeedbackEngine["getFounderFeedbackSummary"]>): string {
    const lines: string[] = [];
    lines.push("Executive Accuracy | Forecast Acc | Rec Score | Best Strategy");
    lines.push("─".repeat(60));
    for (const ea of feedback.executiveAccuracy) {
      lines.push(`${ea.executive.padEnd(6)} ${ea.successRate.toFixed(1).padStart(5)}%  ${ea.trend.padEnd(10)}`);
    }
    lines.push("");
    lines.push(`Forecast Accuracy:        ${feedback.forecastAccuracy.toFixed(1)}%`);
    lines.push(`Recommendation Score:    ${(feedback.recommendationScore * 100).toFixed(0)}%`);
    lines.push(`Best Strategy:           ${feedback.bestStrategy}`);
    lines.push(`Worst Strategy:          ${feedback.worstStrategy}`);
    lines.push(`Top Failure Pattern:     ${feedback.topFailurePattern}`);
    lines.push(`Top Success Pattern:     ${feedback.topSuccessPattern}`);
    return lines.join("\n");
  }
}
