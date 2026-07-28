import type { BusinessScenario } from "../types";

export const councilScenarios: BusinessScenario[] = [
  {
    id: "cnc-001", name: "Revenue Drop Council", domain: "council",
    description: "Pendapatan turun, perlu rapat council untuk strategi",
    trigger: { type: "event", eventType: "council.revenue_drop", data: { currentMonth: 2800000000, prevMonth: 3500000000, dropPct: 20, yoyGrowth: -5, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_finance", "cap_sales", "cap_marketing"],
    expectedActions: ["EmergencyCouncilMeeting", "RevenueRecoveryPlan"], expectedEvents: ["council.emergency_session_created", "council.revenue_plan"],
    priority: "critical", tags: ["council", "revenue", "strategy"],
  },
  {
    id: "cnc-002", name: "Margin Drop Alert", domain: "council",
    description: "Margin keuntungan menurun drastis, perlu keputusan kolektif",
    trigger: { type: "event", eventType: "council.margin_drop", data: { grossMargin: 15.2, targetMargin: 25.0, dropPct: 39.2, mainDriver: "Kenaikan harga bahan baku 30%", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CFO", expectedCapabilities: ["cap_finance", "cap_purchasing", "cap_sales"],
    expectedActions: ["CouncilPriceReview", "CostCuttingPlan"], expectedEvents: ["council.margin_strategy", "finance.cost_initiative"],
    priority: "critical", tags: ["council", "margin", "finance"],
  },
  {
    id: "cnc-003", name: "Quarterly Business Review", domain: "council",
    description: "Review bisnis triwulan dengan semua executive",
    trigger: { type: "event", eventType: "council.quarterly_review", data: { quarter: "Q3-2026", revenue: 9000000000, targetRevenue: 10500000000, profit: 1350000000, targetProfit: 2100000000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion", "cap_finance", "cap_sales", "cap_marketing", "cap_hr", "cap_production"],
    expectedActions: ["QuarterlyAssessment", "RevisedForecast"], expectedEvents: ["council.quarterly_complete"],
    priority: "high", tags: ["council", "quarterly", "strategic"],
  },
  {
    id: "cnc-004", name: "Annual Strategic Planning", domain: "council",
    description: "Perencanaan strategis tahunan dengan semua executive",
    trigger: { type: "event", eventType: "council.annual_planning", data: { year: 2027, revenueTarget: 45000000000, projectedGrowth: 25, expansionPlans: 3, hiringNeeds: 120, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion", "cap_finance", "cap_hr", "cap_marketing", "cap_platform", "cap_production"],
    expectedActions: ["AnnualPlanDraft", "BudgetAllocation"], expectedEvents: ["council.annual_plan_created"],
    priority: "high", tags: ["council", "annual", "strategic"],
  },
];
