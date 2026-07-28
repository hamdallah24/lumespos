import type { BusinessScenario } from "../types";

export const expansionScenarios: BusinessScenario[] = [
  {
    id: "exp-001", name: "Expansion Opportunity Identified", domain: "expansion",
    description: "Peluang ekspansi ke kota baru teridentifikasi",
    trigger: { type: "event", eventType: "expansion.opportunity", data: { cityName: "Bandung", marketSize: 5000000, competitorCount: 3, estimatedInvestment: 2500000000, projectedROI: 35, paybackPeriod: "18 bulan", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion", "cap_finance"],
    expectedActions: ["FeasibilityStudy", "BoardPresentation"], expectedEvents: ["expansion.study_started"],
    priority: "high", tags: ["expansion", "growth", "strategy"],
  },
  {
    id: "exp-002", name: "Branch Underperform", domain: "expansion",
    description: "Cabang menunjukkan performa di bawah standar",
    trigger: { type: "event", eventType: "expansion.branch_underperform", data: { branchId: 3, branchName: "Cabang Surabaya", revenueTarget: 2000000000, actualRevenue: 1250000000, gap: 750000000, monthsBelowTarget: 4 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion", "cap_finance", "cap_hr"],
    expectedActions: ["BranchAudit", "TurnaroundPlan"], expectedEvents: ["expansion.branch_turnaround"],
    priority: "high", tags: ["expansion", "branch", "performance"],
  },
  {
    id: "exp-003", name: "New Market Entry", domain: "expansion",
    description: "Ekspansi ke segmen pasar baru",
    trigger: { type: "event", eventType: "expansion.new_market", data: { marketSegment: "Horeka (Hotel Restoran Kafe)", estimatedSize: 15000000000, currentPenetration: 2, targetPenetration: 15, requiredInvestment: 500000000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion", "cap_marketing", "cap_sales"],
    expectedActions: ["MarketAnalysis", "GoToMarketPlan"], expectedEvents: ["expansion.gtm_created"],
    priority: "high", tags: ["expansion", "market", "strategy"],
  },
  {
    id: "exp-004", name: "Regulatory Change Impact", domain: "expansion",
    description: "Perubahan regulasi berdampak pada rencana ekspansi",
    trigger: { type: "event", eventType: "expansion.regulatory_change", data: { regulation: "UU Cipta Kerja Pasal 45", impact: "Persyaratan izin usaha baru lebih ketat", effectiveDate: "2026-09-01", affectedPlans: ["Ekspansi Bandung", "Ekspansi Semarang"], branchId: 1 }, branchId: 1 },
    expectedExecutive: "CEO", expectedCapabilities: ["cap_expansion"],
    expectedActions: ["LegalReview", "AdjustTimeline"], expectedEvents: ["expansion.regulatory_assessed"],
    priority: "normal", tags: ["expansion", "regulatory", "risk"],
  },
];
