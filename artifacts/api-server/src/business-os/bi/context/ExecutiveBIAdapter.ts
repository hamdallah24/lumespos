import type { BIContext, CEOBIContext, COOBIContext, CFOContextBI, CMOBIContext, CHROBIContext, CKOBIContext, CAIOBIContext, CTOBIContext } from "./BIContext";

export class ExecutiveBIAdapter {
  toCEO(bi: BIContext): CEOBIContext {
    const revKpi = bi.kpis.find(k => k.kpiId === "kpi_revenue");
    const profitKpi = bi.kpis.find(k => k.kpiId === "kpi_ebitda");
    const healthVal = bi.health.overall;
    const revForecast = bi.forecasts.find(f => f.metric === "kpi_revenue");

    return {
      companyHealth: healthVal,
      companyForecast: {
        revenue30d: revForecast?.forecast30d ?? revKpi?.value ?? 0,
        revenue90d: revForecast?.forecast90d ?? revKpi?.value ?? 0,
        revenue365d: revForecast?.forecast365d ?? revKpi?.value ?? 0,
      },
      growthTrend: {
        revenue: revKpi ? ((revKpi.previousValue && revKpi.previousValue > 0) ? ((revKpi.value - revKpi.previousValue) / revKpi.previousValue) * 100 : 0) : 0,
        profit: profitKpi ? ((profitKpi.previousValue && profitKpi.previousValue > 0) ? ((profitKpi.value - profitKpi.previousValue) / profitKpi.previousValue) * 100 : 0) : 0,
        expansion: 0,
      },
      riskSummary: bi.health.topRisks.map(r => ({ risk: r.risk, severity: r.severity })),
      executivePerformance: bi.kpis.reduce((acc, k) => {
        const exec = this.kpiToExecutive(k.kpiId);
        const existing = acc.find(e => e.executive === exec);
        if (existing) existing.score = (existing.score + (k.higherIsBetter ? k.value : 100 - k.value)) / 2;
        else acc.push({ executive: exec, score: k.higherIsBetter ? Math.min(100, k.value) : Math.max(0, 100 - k.value), status: "active" });
        return acc;
      }, [] as { executive: string; score: number; status: string }[]),
    };
  }

  toCOO(bi: BIContext): COOBIContext {
    const turnoverKpi = bi.kpis.find(k => k.kpiId === "kpi_inventory_turnover");
    const wasteKpi = bi.kpis.find(k => k.kpiId === "kpi_waste_pct");
    const yieldKpi = bi.kpis.find(k => k.kpiId === "kpi_yield");
    const pickingKpi = bi.kpis.find(k => k.kpiId === "kpi_picking_accuracy");
    const stockoutKpi = bi.kpis.find(k => k.kpiId === "kpi_stockout_rate");
    const stockoutForecast = bi.forecasts.find(f => f.metric === "kpi_stockout_rate");

    return {
      inventoryForecast: {
        stockoutRisk: stockoutKpi && stockoutKpi.value > 3 ? "high" : stockoutKpi && stockoutKpi.value > 1 ? "medium" : "low",
        reorderPoint: turnoverKpi ? Math.round(turnoverKpi.value * 7) : null,
        daysUntilStockout: stockoutForecast ? Math.round(stockoutForecast.forecast7d) : null,
      },
      warehouseHealth: pickingKpi?.value ?? null,
      productionTrend: {
        yield: yieldKpi?.value ?? null,
        oee: bi.kpis.find(k => k.kpiId === "kpi_oee")?.value ?? null,
        waste: wasteKpi?.value ?? null,
      },
      supplierRisk: bi.alerts.filter(a => a.message.toLowerCase().includes("supplier") || a.message.toLowerCase().includes("purchasing")).map(a => ({ supplier: a.kpiName, risk: a.severity })),
      stockPrediction: stockoutKpi && stockoutKpi.value > 3 ? "Stok perlu perhatian" : "Stok dalam kondisi baik",
    };
  }

  toCFO(bi: BIContext): CFOContextBI {
    const cashKpi = bi.kpis.find(k => k.kpiId === "kpi_cash_flow");
    const grossKpi = bi.kpis.find(k => k.kpiId === "kpi_gross_margin");
    const netKpi = bi.kpis.find(k => k.kpiId === "kpi_net_margin");
    const expenseKpi = bi.kpis.find(k => k.kpiId === "kpi_operating_expense");
    const cashForecast = bi.forecasts.find(f => f.metric === "kpi_cash_flow");

    return {
      cashForecast: {
        runway: cashForecast?.forecast30d ?? null,
        criticalDate: cashKpi && cashKpi.value < 0 ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
      },
      cashRunway: cashKpi?.value ?? null,
      marginTrend: {
        gross: grossKpi?.value ?? 0,
        net: netKpi?.value ?? 0,
        trend: grossKpi && grossKpi.previousValue ? (grossKpi.value > grossKpi.previousValue ? "membaik" : "menurun") : "stabil",
      },
      expenseVariance: [
        { category: "operational", variance: ((expenseKpi?.value ?? 0) - (expenseKpi?.previousValue ?? 0)) / (expenseKpi?.previousValue || 1) * 100, isSignificant: Math.abs(((expenseKpi?.value ?? 0) - (expenseKpi?.previousValue ?? 0)) / (expenseKpi?.previousValue || 1)) > 0.1 },
      ],
      financialHealth: bi.health.dimensions.find(d => d.dimension === "finance")?.score ?? null,
    };
  }

  toCMO(bi: BIContext): CMOBIContext {
    const roasKpi = bi.kpis.find(k => k.kpiId === "kpi_roas");
    const cacKpi = bi.kpis.find(k => k.kpiId === "kpi_cac");
    const convKpi = bi.kpis.find(k => k.kpiId === "kpi_conversion_rate");

    return {
      campaignRanking: bi.benchmarks.filter(b => b.entityType === "campaign").map(b => ({ campaign: b.entity, roi: b.score })),
      roas: roasKpi?.value ?? 0,
      cac: cacKpi?.value ?? 0,
      conversionTrend: {
        rate: convKpi?.value ?? 0,
        trend: convKpi && convKpi.previousValue ? (convKpi.value > convKpi.previousValue ? "meningkat" : "menurun") : "stabil",
      },
      marketInsight: bi.narratives.filter(n => n.dimension === "marketing" || n.dimension === "sales").map(n => n.headline),
    };
  }

  toCHRO(bi: BIContext): CHROBIContext {
    const turnoverKpi = bi.kpis.find(k => k.kpiId === "kpi_turnover");
    const attendKpi = bi.kpis.find(k => k.kpiId === "kpi_attendance");
    const prodKpi = bi.kpis.find(k => k.kpiId === "kpi_productivity");

    return {
      turnoverPrediction: {
        rate: turnoverKpi?.value ?? 0,
        trend: turnoverKpi && turnoverKpi.previousValue ? (turnoverKpi.value > turnoverKpi.previousValue ? "meningkat" : "menurun") : "stabil",
      },
      attendanceTrend: {
        rate: attendKpi?.value ?? null,
        trend: attendKpi && attendKpi.previousValue ? (attendKpi.value > attendKpi.previousValue ? "membaik" : "menurun") : "stabil",
      },
      productivityTrend: {
        value: prodKpi?.value ?? 0,
        trend: prodKpi && prodKpi.previousValue ? (prodKpi.value > prodKpi.previousValue ? "meningkat" : "menurun") : "stabil",
      },
      hiringForecast: [{ needs: Math.max(0, Math.round((turnoverKpi?.value ?? 0) / 100 * 50)), months: 3 }],
    };
  }

  toCKO(bi: BIContext): CKOBIContext {
    return {
      learningTrend: { completion: null, trend: "stabil" },
      knowledgeGap: bi.narratives.filter(n => n.type === "warning").map(n => n.headline).slice(0, 3),
      documentationHealth: null,
    };
  }

  toCAIO(bi: BIContext): CAIOBIContext {
    return {
      automationTrend: { coverage: null, trend: "meningkat" },
      modelAccuracy: null,
      agentPerformance: [],
    };
  }

  toCTO(bi: BIContext): CTOBIContext {
    const uptimeKpi = bi.kpis.find(k => k.kpiId === "kpi_uptime");
    return {
      deploymentHealth: uptimeKpi?.value ?? null,
      bugTrend: { count: bi.alerts.filter(a => a.dimension === "platform").length, trend: "stabil" },
      technicalDebt: { score: null, items: [] },
      uptimeForecast: uptimeKpi?.value ?? null,
    };
  }

  map(executive: string, bi: BIContext): any {
    switch (executive) {
      case "CEO": return this.toCEO(bi);
      case "COO": return this.toCOO(bi);
      case "CFO": return this.toCFO(bi);
      case "CMO": return this.toCMO(bi);
      case "CHRO": return this.toCHRO(bi);
      case "CKO": return this.toCKO(bi);
      case "CAIO": return this.toCAIO(bi);
      case "CTO": return this.toCTO(bi);
      default: return {};
    }
  }

  private kpiToExecutive(kpiId: string): string {
    const map: Record<string, string> = {
      kpi_revenue: "CMO", kpi_orders: "CMO", kpi_aov: "CMO",
      kpi_inventory_turnover: "COO", kpi_stockout_rate: "COO", kpi_waste_pct: "COO",
      kpi_gross_margin: "CFO", kpi_net_margin: "CFO", kpi_cash_flow: "CFO", kpi_ebitda: "CFO",
      kpi_attendance: "CHRO", kpi_turnover: "CHRO", kpi_productivity: "CHRO",
      kpi_uptime: "CTO", kpi_error_rate: "CTO", kpi_api_latency: "CTO",
    };
    return map[kpiId] ?? "CEO";
  }
}
