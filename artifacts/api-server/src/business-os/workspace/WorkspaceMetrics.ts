import type { ExecutiveWorkspaceState, WorkspaceMetricsData, KPIDefinition } from "./WorkspaceTypes";

let kpiCounter = 0;

function nextKpiId(): string {
  kpiCounter++;
  return `kpi-${Date.now()}-${kpiCounter}`;
}

export function createKPI(
  executive: string,
  name: string,
  description: string,
  targetValue: number,
  unit: string,
): KPIDefinition {
  return {
    id: nextKpiId(),
    executive,
    name,
    description,
    currentValue: 0,
    targetValue,
    unit,
    trend: "stable",
    updatedAt: new Date().toISOString(),
  };
}

export function updateKPI(kpi: KPIDefinition, newValue: number): KPIDefinition {
  const trend: KPIDefinition["trend"] = newValue > kpi.currentValue ? "up" : newValue < kpi.currentValue ? "down" : "stable";
  return { ...kpi, currentValue: newValue, trend, updatedAt: new Date().toISOString() };
}

export function computeMetrics(state: ExecutiveWorkspaceState): WorkspaceMetricsData {
  const totalDecisions = state.decisions.length;
  const totalExecutions = state.executions.length;
  const successfulExecs = state.executions.filter(e => e.success).length;
  const totalRecs = state.recommendations.length;
  const accepted = state.recommendations.filter(r => r.status === "accepted").length;
  const rejected = state.recommendations.filter(r => r.status === "rejected").length;
  const completedObjectives = state.objectives.filter(o => o.status === "completed").length;
  const totalObjectives = state.objectives.length || 1;
  const completedTasks = state.tasks.filter(t => t.status === "completed").length;

  const decisionTimes = state.decisions.map(d => Date.now() - new Date(d.timestamp).getTime());
  const avgDecisionTime = decisionTimes.length > 0 ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length : 0;
  const execTimes = state.executions.map(e => e.durationMs);
  const avgExecTime = execTimes.length > 0 ? execTimes.reduce((a, b) => a + b, 0) / execTimes.length : 0;

  const pendingApprovals = state.approvals.filter(a => a.status === "pending");
  const approvalDelays = pendingApprovals.map(a => Date.now() - new Date(a.requestedAt).getTime());
  const avgApprovalDelay = approvalDelays.length > 0 ? approvalDelays.reduce((a, b) => a + b, 0) / approvalDelays.length : 0;

  const confidences = state.decisions.map(d => d.confidence);
  const avgConf = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  return {
    tasksCompleted: completedTasks,
    recommendationsAccepted: accepted,
    recommendationsRejected: rejected,
    averageConfidence: Math.round(avgConf * 100) / 100,
    executionSuccessRate: totalExecutions > 0 ? Math.round((successfulExecs / totalExecutions) * 10000) / 100 : 0,
    approvalDelayMs: Math.round(avgApprovalDelay),
    averageDecisionTimeMs: Math.round(avgDecisionTime),
    averageExecutionTimeMs: Math.round(avgExecTime),
    eventCount: state.timeline.filter(t => t.type === "event").length,
    objectiveCompletionRate: Math.round((completedObjectives / totalObjectives) * 10000) / 100,
    updatedAt: new Date().toISOString(),
  };
}

export const DEFAULT_KPIS: Record<string, KPIDefinition[]> = {
  COO: [
    createKPI("COO", "Inventory Accuracy", "Kesesuaian stok fisik dengan sistem", 95, "%"),
    createKPI("COO", "Warehouse Utilization", "Penggunaan kapasitas gudang", 80, "%"),
    createKPI("COO", "Stock Turnover", "Perputaran stok per bulan", 4, "x"),
    createKPI("COO", "Production Efficiency", "Efisiensi produksi", 90, "%"),
    createKPI("COO", "Supplier On-Time Rate", "Persentase pengiriman tepat waktu", 90, "%"),
  ],
  CFO: [
    createKPI("CFO", "Cash Flow Health", "Kesehatan arus kas", 80, "%"),
    createKPI("CFO", "Gross Profit Margin", "Margin laba kotor", 40, "%"),
    createKPI("CFO", "Expense Ratio", "Rasio biaya terhadap revenue", 30, "%"),
    createKPI("CFO", "Revenue Growth", "Pertumbuhan pendapatan", 15, "%"),
  ],
  CMO: [
    createKPI("CMO", "Campaign ROI", "Return on marketing investment", 3, "x"),
    createKPI("CMO", "Conversion Rate", "Tingkat konversi penjualan", 5, "%"),
    createKPI("CMO", "Customer Reach", "Jangkauan pelanggan", 10000, "orang"),
  ],
  CHRO: [
    createKPI("CHRO", "Attendance Rate", "Tingkat kehadiran karyawan", 90, "%"),
    createKPI("CHRO", "Employee Retention", "Retensi karyawan per tahun", 85, "%"),
    createKPI("CHRO", "Recruitment Fill Rate", "Kecepatan pengisian posisi kosong", 30, "hari"),
  ],
  CEO: [
    createKPI("CEO", "Company Health Score", "Skor kesehatan perusahaan keseluruhan", 80, "%"),
    createKPI("CEO", "Strategic Goal Completion", "Pencapaian target strategis", 70, "%"),
    createKPI("CEO", "Governance Compliance", "Kepatuhan terhadap governance", 95, "%"),
  ],
  CAIO: [
    createKPI("CAIO", "System Intelligence", "Kualitas kecerdasan sistem", 85, "%"),
    createKPI("CAIO", "Knowledge Quality", "Kualitas pengetahuan tersimpan", 90, "%"),
    createKPI("CAIO", "Automation Coverage", "Cakupan otomatisasi keputusan", 60, "%"),
  ],
  CKO: [
    createKPI("CKO", "Knowledge Base Size", "Jumlah pengetahuan tersimpan", 500, "entries"),
    createKPI("CKO", "Knowledge Retrieval Accuracy", "Akurasi pencarian pengetahuan", 85, "%"),
  ],
  CTO: [
    createKPI("CTO", "System Uptime", "Uptime sistem", 99, "%"),
    createKPI("CTO", "Deployment Frequency", "Frekuensi deployment per minggu", 3, "x"),
  ],
};
