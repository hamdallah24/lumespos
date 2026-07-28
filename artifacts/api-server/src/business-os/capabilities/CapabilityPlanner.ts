import type { CapabilityPlan, CapabilityPlanStep, RiskLevel, ComplexityLevel } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityDependency from "./CapabilityDependency";

let planCounter = 0;

function generatePlanId(): string {
  planCounter++;
  return `plan-${Date.now()}-${planCounter}`;
}

function aggregateRisk(steps: CapabilityPlanStep[]): RiskLevel {
  const risks = steps.map(s => s.estimatedRisk);
  if (risks.includes("critical")) return "critical";
  if (risks.includes("high")) return "high";
  if (risks.includes("medium")) return "medium";
  return "low";
}

function aggregateComplexity(steps: CapabilityPlanStep[]): ComplexityLevel {
  const complexities = steps.map(s => s.estimatedComplexity);
  if (complexities.includes("very_complex")) return "very_complex";
  if (complexities.includes("complex")) return "complex";
  if (complexities.includes("moderate")) return "moderate";
  return "simple";
}

const OBJECTIVE_PLANS: Record<string, { capabilityId: string; action: string; description: string; order: number; dependsOn: string[] }[]> = {
  "open new branch": [
    { capabilityId: "cap_expansion", action: "Conduct Feasibility Study", description: "Studi kelayakan lokasi cabang baru", order: 1, dependsOn: [] },
    { capabilityId: "cap_expansion", action: "Plan Expansion Roadmap", description: "Koordinasi roadmap ekspansi dengan executive", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_expansion", action: "Open New Branch", description: "Eksekusi pembukaan cabang baru", order: 3, dependsOn: ["step-2"] },
    { capabilityId: "cap_hr", action: "Recruit Employee", description: "Rekrut staff untuk cabang baru", order: 4, dependsOn: ["step-3"] },
    { capabilityId: "cap_warehouse", action: "Create Warehouse", description: "Setup gudang untuk cabang baru", order: 5, dependsOn: ["step-3"] },
    { capabilityId: "cap_inventory", action: "Restock", description: "Isi stok awal untuk cabang baru", order: 6, dependsOn: ["step-5"] },
    { capabilityId: "cap_platform", action: "Configure System", description: "Konfigurasi sistem POS untuk cabang baru", order: 7, dependsOn: ["step-3"] },
    { capabilityId: "cap_marketing", action: "Create Campaign", description: "Kampanye grand opening cabang baru", order: 8, dependsOn: ["step-6", "step-7"] },
  ],
  "restock inventory": [
    { capabilityId: "cap_purchasing", action: "Create Purchase Order", description: "Buat PO untuk pembelian stok", order: 1, dependsOn: [] },
    { capabilityId: "cap_purchasing", action: "Approve Purchase Order", description: "Approval PO", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_inventory", action: "Receive Goods", description: "Terima barang dari supplier", order: 3, dependsOn: ["step-2"] },
    { capabilityId: "cap_inventory", action: "Restock", description: "Update stok setelah penerimaan", order: 4, dependsOn: ["step-3"] },
  ],
  "hire employee": [
    { capabilityId: "cap_hr", action: "Recruit Employee", description: "Proses rekrutmen", order: 1, dependsOn: [] },
    { capabilityId: "cap_hr", action: "Manage Training", description: "Training onboarding", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_platform", action: "Manage System Access", description: "Buat akun sistem", order: 3, dependsOn: ["step-1"] },
    { capabilityId: "cap_finance", action: "Record Expense", description: "Catat biaya rekrutmen", order: 4, dependsOn: ["step-1"] },
  ],
  "monthly closing": [
    { capabilityId: "cap_inventory", action: "Audit Stock", description: "Audit stok akhir periode", order: 1, dependsOn: [] },
    { capabilityId: "cap_inventory", action: "Inventory Valuation", description: "Valuasi persediaan", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_sales", action: "Generate Sales Report", description: "Laporan penjualan", order: 3, dependsOn: [] },
    { capabilityId: "cap_finance", action: "Reconcile Account", description: "Rekonsiliasi akun", order: 4, dependsOn: ["step-2", "step-3"] },
    { capabilityId: "cap_finance", action: "Generate Financial Report", description: "Laporan keuangan", order: 5, dependsOn: ["step-4"] },
    { capabilityId: "cap_finance", action: "Close Books", description: "Tutup buku", order: 6, dependsOn: ["step-5"] },
  ],
  "marketing campaign": [
    { capabilityId: "cap_marketing", action: "Analyze Market", description: "Analisis pasar dan target audience", order: 1, dependsOn: [] },
    { capabilityId: "cap_marketing", action: "Manage Brand Assets", description: "Siapkan materi brand", order: 2, dependsOn: [] },
    { capabilityId: "cap_marketing", action: "Create Campaign", description: "Buat campaign", order: 3, dependsOn: ["step-1", "step-2"] },
    { capabilityId: "cap_marketing", action: "Manage Promotion", description: "Set promosi", order: 4, dependsOn: ["step-3"] },
    { capabilityId: "cap_crm", action: "Send Communication", description: "Komunikasi ke pelanggan", order: 5, dependsOn: ["step-4"] },
    { capabilityId: "cap_marketing", action: "Manage Social Media", description: "Posting sosial media", order: 6, dependsOn: ["step-3"] },
  ],
  "reduce stock discrepancy": [
    { capabilityId: "cap_inventory", action: "Stock Count", description: "Opname stok", order: 1, dependsOn: [] },
    { capabilityId: "cap_inventory", action: "Audit Stock", description: "Audit stok", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_inventory", action: "Adjust Stock", description: "Adjust selisih", order: 3, dependsOn: ["step-2"] },
  ],
  "transfer stock": [
    { capabilityId: "cap_inventory", action: "Transfer Stock", description: "Transfer stok antar cabang", order: 1, dependsOn: [] },
    { capabilityId: "cap_warehouse", action: "Ship Items", description: "Kirim barang", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_warehouse", action: "Receive Transfer", description: "Terima di tujuan", order: 3, dependsOn: ["step-2"] },
  ],
  "improve cash flow": [
    { capabilityId: "cap_finance", action: "Manage Cash Flow", description: "Analisis arus kas terkini", order: 1, dependsOn: [] },
    { capabilityId: "cap_sales", action: "Apply Discount", description: "Promosi untuk dorong penjualan", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_purchasing", action: "Evaluate Supplier", description: "Evaluasi pembayaran supplier", order: 3, dependsOn: ["step-1"] },
    { capabilityId: "cap_finance", action: "Record Revenue", description: "Catat pendapatan non-operasional", order: 4, dependsOn: [] },
  ],
  "supplier evaluation": [
    { capabilityId: "cap_purchasing", action: "Evaluate Supplier", description: "Evaluasi performa supplier", order: 1, dependsOn: [] },
    { capabilityId: "cap_purchasing", action: "Manage Supplier Contract", description: "Review kontrak supplier", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_purchasing", action: "Create Purchase Order", description: "Tindak lanjut hasil evaluasi", order: 3, dependsOn: ["step-2"] },
  ],
  "new product launch": [
    { capabilityId: "cap_expansion", action: "Expand Product Line", description: "Persiapan lini produk baru", order: 1, dependsOn: [] },
    { capabilityId: "cap_production", action: "Manage BOM", description: "Buat BOM untuk produk baru", order: 2, dependsOn: ["step-1"] },
    { capabilityId: "cap_marketing", action: "Create Campaign", description: "Kampanye peluncuran", order: 3, dependsOn: ["step-1"] },
    { capabilityId: "cap_inventory", action: "Restock", description: "Isi stok produk baru", order: 4, dependsOn: ["step-2"] },
  ],
};

export function createPlan(objective: string, customSteps?: { capabilityId: string; action: string; description: string; order: number; dependsOn: string[] }[]): CapabilityPlan {
  const lowerObjective = objective.toLowerCase();

  let template = OBJECTIVE_PLANS[lowerObjective];
  if (!template) {
    for (const [key, steps] of Object.entries(OBJECTIVE_PLANS)) {
      if (lowerObjective.includes(key) || key.includes(lowerObjective)) {
        template = steps;
        break;
      }
    }
  }

  const steps = customSteps || template;
  if (!steps || steps.length === 0) {
    return {
      planId: generatePlanId(),
      title: `Plan: ${objective}`,
      objective,
      steps: [],
      totalRisk: "low",
      totalComplexity: "simple",
      requiredCapabilities: [],
      requiredExecutives: [],
      estimatedDuration: "N/A",
      status: "draft",
      createdAt: new Date().toISOString(),
    };
  }

  let stepIndex = 0;
  const planSteps: CapabilityPlanStep[] = steps.map(s => {
    stepIndex++;
    const cap = CapabilityRegistry.getCapabilityById(s.capabilityId);
    const action = cap?.supportedActions.find(a => a.name.toLowerCase() === s.action.toLowerCase());
    return {
      stepId: `step-${stepIndex}`,
      order: s.order,
      action: s.action,
      capabilityId: s.capabilityId,
      description: s.description,
      dependsOn: s.dependsOn,
      requiredContext: {},
      estimatedRisk: action?.riskLevel || "medium",
      estimatedComplexity: cap?.estimatedComplexity || "moderate",
      ownerExecutive: cap?.ownerExecutive || "unknown",
      status: "draft",
    };
  });

  const allCapIds = [...new Set(steps.map(s => s.capabilityId))];
  const allExecs = [...new Set(allCapIds.map(id => CapabilityRegistry.getCapabilityById(id)?.ownerExecutive).filter(Boolean))];

  return {
    planId: generatePlanId(),
    title: `Plan: ${objective}`,
    objective,
    steps: planSteps,
    totalRisk: aggregateRisk(planSteps),
    totalComplexity: aggregateComplexity(planSteps),
    requiredCapabilities: allCapIds,
    requiredExecutives: allExecs as string[],
    estimatedDuration: `${steps.length * 2} hari`,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

export function createDynamicPlan(objective: string, context: Record<string, unknown>): CapabilityPlan {
  let steps: { capabilityId: string; action: string; description: string; order: number; dependsOn: string[] }[] = [];

  const contextKeys = Object.keys(context).map(k => k.toLowerCase());
  const isRestock = contextKeys.some(k => k.includes("stock") || k.includes("restock") || k.includes("inventory"));
  const isFinance = contextKeys.some(k => k.includes("cash") || k.includes("finance") || k.includes("budget"));
  const isHire = contextKeys.some(k => k.includes("hire") || k.includes("staff") || k.includes("employee") || k.includes("recruit"));
  const isProduction = contextKeys.some(k => k.includes("produksi") || k.includes("production") || k.includes("bom"));

  if (isRestock) {
    steps = OBJECTIVE_PLANS["restock inventory"] || [];
  } else if (isHire) {
    steps = OBJECTIVE_PLANS["hire employee"] || [];
  } else if (isFinance) {
    steps = OBJECTIVE_PLANS["improve cash flow"] || [];
  } else if (isProduction) {
    steps = OBJECTIVE_PLANS["new product launch"] || [];
  }

  return createPlan(objective, steps.length > 0 ? steps : undefined);
}

export function getAvailableTemplates(): string[] {
  return Object.keys(OBJECTIVE_PLANS);
}
