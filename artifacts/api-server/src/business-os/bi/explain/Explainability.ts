import { DecisionExplanation } from "./DecisionExplanation";
import { InsightTrace } from "./InsightTrace";
import { ExplanationTrace, NarrativeInsight, KPIValue } from "../types";

const KPI_TO_ERP_SOURCE: Record<string, { context: string; field: string }> = {
  kpi_revenue: { context: "sales", field: "period.revenue" },
  kpi_gross_sales: { context: "sales", field: "period.revenue" },
  kpi_net_sales: { context: "sales", field: "period.revenue" },
  kpi_aov: { context: "sales", field: "period.revenue / period.orders" },
  kpi_orders: { context: "sales", field: "period.orders" },
  kpi_inventory_turnover: { context: "inventory", field: "COGS / average inventory value" },
  kpi_inventory_value: { context: "inventory", field: "inventoryValue.total" },
  kpi_stock_accuracy: { context: "inventory", field: "validationScore" },
  kpi_stockout_rate: { context: "inventory", field: "stockRisks count (severity=critical)" },
  kpi_waste_pct: { context: "inventory", field: "movementSummary waste events" },
  kpi_dead_stock: { context: "inventory", field: "dead stock from movements" },
  kpi_gross_margin: { context: "finance", field: "profit.margin" },
  kpi_net_margin: { context: "finance", field: "profit.margin" },
  kpi_cash_flow: { context: "finance", field: "cashPosition.current" },
  kpi_burn_rate: { context: "finance", field: "expenseTrend" },
  kpi_ebitda: { context: "finance", field: "profit.net" },
  kpi_operating_expense: { context: "finance", field: "expenseTrend" },
  kpi_working_capital: { context: "finance", field: "cashPosition" },
  kpi_dso: { context: "finance", field: "receivables" },
  kpi_attendance: { context: "hr", field: "attendance.rate" },
  kpi_turnover: { context: "hr", field: "headcount changes" },
  kpi_productivity: { context: "hr", field: "revenue / headcount" },
  kpi_headcount: { context: "hr", field: "headcount.total" },
  kpi_yield: { context: "production", field: "efficiency.yield" },
  kpi_production_waste: { context: "production", field: "efficiency.waste" },
  kpi_oee: { context: "production", field: "efficiency" },
  kpi_warehouse_capacity: { context: "inventory", field: "warehouseUtilization.percent" },
  kpi_supplier_on_time: { context: "purchasing", field: "suppliers[].reliability" },
  kpi_po_cycle_time: { context: "purchasing", field: "pendingPOs" },
  kpi_uptime: { context: "platform", field: "monitoring" },
  kpi_error_rate: { context: "platform", field: "monitoring" },
  kpi_cac: { context: "marketing", field: "marketing spend / new customers" },
  kpi_roas: { context: "marketing", field: "ad revenue / ad spend" },
  kpi_retention: { context: "crm", field: "repeat customers" },
  kpi_churn_rate: { context: "crm", field: "lost customers" },
};

const KPI_DIMENSION_MAP: Record<string, string> = {
  sales: "SalesContextBuilder",
  inventory: "InventoryContextBuilder",
  finance: "FinanceContextBuilder",
  hr: "HRContextBuilder",
  production: "ProductionContextBuilder",
  purchasing: "PurchasingContextBuilder",
  marketing: "SalesContextBuilder",
  crm: "SalesContextBuilder",
  warehouse: "InventoryContextBuilder",
  platform: "System Monitor",
  expansion: "SalesContextBuilder",
};

export class Explainability {
  decision: DecisionExplanation;
  insight: InsightTrace;

  constructor() {
    this.decision = new DecisionExplanation();
    this.insight = new InsightTrace();
  }

  explainDecision(
    decisionId: string,
    executive: string,
    action: string,
    reasoning: string,
    triggers: { source: string; data: any; threshold?: any }[],
    dataPoints: { label: string; value: any; source: string }[]
  ): ExplanationTrace {
    return this.decision.explain(decisionId, executive, action, reasoning, triggers, dataPoints);
  }

  explainInsight(
    insight: NarrativeInsight
  ): { trace: { rootData: string[]; derivation: string; confidence: number }; formatted: string } {
    const trace = this.insight.trace(insight);
    const formatted = this.insight.formatTrace(trace);
    return { trace, formatted };
  }

  traceLineage(
    kpiId: string,
    kpis: KPIValue[],
    analytics: any[],
    forecasts: any[],
    health: any
  ): {
    kpi: { id: string; value: number; source: string };
    analytics: { trend: string; changePct: number } | null;
    forecast: { forecast30d: number; confidence: number } | null;
    health: { score: number; status: string } | null;
    erpContext: { builder: string; field: string };
    chain: string[];
  } {
    const source = KPI_TO_ERP_SOURCE[kpiId] ?? { context: "unknown", field: "unknown" };
    const kpi = kpis.find(k => k.kpiId === kpiId);
    const analysis = analytics?.find((a: any) => a.metric === kpi?.kpiName);
    const forecast = forecasts?.find((f: any) => f.metric === kpiId);
    const dimHealth = health?.dimensions?.find((d: any) => d.dimension === source.context);

    const chain = [
      `ERP → ${source.context}`,
      `ContextBuilder (${KPI_DIMENSION_MAP[source.context] ?? "Unknown"})`,
      `KPI (${kpiId})`,
    ];
    if (analysis) chain.push("Analytics");
    if (forecast) chain.push("Forecast");
    if (dimHealth) chain.push("Health");
    chain.push("BI Context → Executive");

    return {
      kpi: kpi ? { id: kpi.kpiId, value: kpi.value, source: `${source.context}.${source.field}` } : { id: kpiId, value: 0, source: "unknown" },
      analytics: analysis ? { trend: analysis.trend, changePct: analysis.changePct } : null,
      forecast: forecast ? { forecast30d: forecast.forecast30d, confidence: forecast.confidence } : null,
      health: dimHealth ? { score: dimHealth.score, status: dimHealth.status } : null,
      erpContext: { builder: KPI_DIMENSION_MAP[source.context] ?? "Unknown", field: source.field },
      chain,
    };
  }

  generateDecisionSummary(traces: ExplanationTrace[]): string {
    const total = traces.length;
    if (total === 0) return "Tidak ada keputusan untuk diringkas.";

    const avgConfidence =
      traces.reduce((sum, t) => sum + t.confidence, 0) / total;

    const lines = [
      `=== Ringkasan ${total} Keputusan ===`,
      "",
      `Total keputusan: ${total}`,
      `Rata-rata confidence: ${(avgConfidence * 100).toFixed(1)}%`,
      "",
      "Detail Keputusan:",
      ...traces.map(
        (t, i) =>
          `${i + 1}. [${t.decisionId}] ${t.executive} — ${t.action} (confidence: ${(t.confidence * 100).toFixed(0)}%)`
      ),
      "",
      `Dihasilkan: ${new Date().toISOString()}`,
    ];

    return lines.join("\n");
  }

  answerQuestion(
    question: string,
    context: {
      decisions: ExplanationTrace[];
      insights: NarrativeInsight[];
      kpis: KPIValue[];
    }
  ): string {
    const q = question.toLowerCase();

    if (q.includes("keputusan") || q.includes("decision")) {
      if (context.decisions.length === 0) return "Belum ada keputusan yang tercatat.";
      return context.decisions
        .map(
          (d) =>
            `${d.executive} memutuskan "${d.action}" karena ${d.reasoning} (confidence: ${(d.confidence * 100).toFixed(0)}%)`
        )
        .join("\n");
    }

    if (q.includes("insight") || q.includes("wawasan")) {
      if (context.insights.length === 0) return "Belum ada insight yang tersedia.";
      return context.insights
        .map((i) => `${i.type.toUpperCase()}: ${i.headline}`)
        .join("\n");
    }

    if (q.includes("kpi") || q.includes("metrik")) {
      if (context.kpis.length === 0) return "Belum ada data KPI.";
      return context.kpis
        .slice(0, 10)
        .map((k) => `${k.kpiName}: ${k.value}${k.unit}`)
        .join("\n");
    }

    if (q.includes("ringkasan") || q.includes("summary")) {
      return this.generateDecisionSummary(context.decisions);
    }

    if (q.includes("lineage") || q.includes("asal") || q.includes("sumber") || q.includes("trace")) {
      if (context.kpis.length === 0) return "Belum ada data KPI untuk dilacak.";
      const lines: string[] = ["=== Lineage KPI ===", ""];
      for (const kpi of context.kpis.slice(0, 10)) {
        const lineage = this.traceLineage(kpi.kpiId, context.kpis, [], [], null);
        lines.push(`${kpi.kpiName}:`);
        lines.push(`  Chain: ${lineage.chain.join(" → ")}`);
        lines.push(`  ERP Source: ${lineage.erpContext.builder} → ${lineage.erpContext.field}`);
        lines.push("");
      }
      return lines.join("\n");
    }

    return `Maaf, saya tidak dapat menjawab pertanyaan "${question}". Coba tanyakan tentang keputusan, insight, KPI, ringkasan, atau lineage.`;
  }
}