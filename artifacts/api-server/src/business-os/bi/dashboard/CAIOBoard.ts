import type { KPIValue, KPIAlert, DashboardSection } from "../types";

export class CAIOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[]): DashboardSection[] {
    return [
      {
        id: "caio_ai_system_health",
        title: "AI System Health",
        type: "kpi_grid",
        data: {
          uptime: kpiValues.find(k => k.kpiId === "kpi_uptime"),
          errorRate: kpiValues.find(k => k.kpiId === "kpi_error_rate"),
          apiLatency: kpiValues.find(k => k.kpiId === "kpi_api_latency"),
          activeUsers: kpiValues.find(k => k.kpiId === "kpi_active_users"),
          services: [
            { name: "Recommendation Engine", status: "healthy", latency: 45 },
            { name: "Forecasting Service", status: "healthy", latency: 120 },
            { name: "Anomaly Detection", status: "degraded", latency: 350 },
            { name: "NLP Processor", status: "healthy", latency: 85 },
            { name: "Computer Vision", status: "healthy", latency: 60 },
          ],
        },
        order: 0,
      },
      {
        id: "caio_automation_coverage",
        title: "Automation Coverage",
        type: "kpi_grid",
        data: {
          overallCoverage: 67,
          processes: [
            { name: "Order Processing", automated: 95, manual: 5 },
            { name: "Invoice Generation", automated: 90, manual: 10 },
            { name: "Inventory Reconciliation", automated: 75, manual: 25 },
            { name: "Customer Support Triage", automated: 60, manual: 40 },
            { name: "Report Generation", automated: 50, manual: 50 },
          ],
          totalProcesses: 42,
          automatedProcesses: 28,
        },
        order: 1,
      },
      {
        id: "caio_model_accuracy",
        title: "Model Accuracy",
        type: "kpi_grid",
        data: {
          models: [
            { name: "Sales Forecast", accuracy: 94.2, lastTrained: "2026-07-20" },
            { name: "Demand Prediction", accuracy: 91.5, lastTrained: "2026-07-18" },
            { name: "Churn Prediction", accuracy: 87.3, lastTrained: "2026-07-15" },
            { name: "Fraud Detection", accuracy: 96.8, lastTrained: "2026-07-22" },
            { name: "Recommendation Engine", accuracy: 89.1, lastTrained: "2026-07-19" },
          ],
          averageAccuracy: 91.8,
          modelCount: 12,
          needsRetraining: 2,
        },
        order: 2,
      },
      {
        id: "caio_system_efficiency_gains",
        title: "System Efficiency Gains",
        type: "kpi_grid",
        data: {
          timeSavedHours: 1240,
          costReduction: 85000000,
          errorReduction: 42,
          processedTransactions: 250000,
          automationSavings: 125000000,
        },
        order: 3,
      },
      {
        id: "caio_ai_cost_benefit",
        title: "AI Cost/Benefit",
        type: "kpi_grid",
        data: {
          totalInvestment: 375000000,
          annualSavings: 520000000,
          roi: 38.7,
          breakdown: [
            { category: "Infrastructure", cost: 150000000 },
            { category: "Development", cost: 125000000 },
            { category: "Data Acquisition", cost: 60000000 },
            { category: "Maintenance", cost: 40000000 },
          ],
          paybackPeriod: "8.7 months",
        },
        order: 4,
      },
    ];
  }
}
