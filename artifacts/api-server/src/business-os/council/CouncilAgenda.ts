import type { CouncilAgendaItem, CouncilOpinion } from "./types";

let counter = 0;

function nextId(): string {
  counter++;
  return `agenda-${Date.now()}-${counter}`;
}

export function createAgendaItem(title: string, description: string, priority: CouncilAgendaItem["priority"] = "normal", requiredExecutives: string[] = []): CouncilAgendaItem {
  return {
    id: nextId(),
    title,
    description,
    priority,
    status: "pending",
    requiredExecutives: requiredExecutives.length > 0 ? requiredExecutives : ["CEO", "COO", "CFO"],
    discussion: [],
  };
}

export function addOpinion(agenda: CouncilAgendaItem, opinion: CouncilOpinion): CouncilAgendaItem {
  return { ...agenda, discussion: [...agenda.discussion, opinion] };
}

export function resolveAgenda(agenda: CouncilAgendaItem, resolution: string): CouncilAgendaItem {
  return { ...agenda, status: "resolved", resolution, resolvedAt: new Date().toISOString() };
}

export function prioritizeAgenda(agenda: CouncilAgendaItem, priority: CouncilAgendaItem["priority"]): CouncilAgendaItem {
  return { ...agenda, priority };
}

export const COMMON_AGENDA_TEMPLATES: Record<string, { title: string; description: string; priority: CouncilAgendaItem["priority"]; requiredExecutives: string[] }> = {
  revenue_decline: { title: "Revenue Decline Analysis", description: "Evaluasi penyebab penurunan revenue dan rencana pemulihan", priority: "critical", requiredExecutives: ["CEO", "CFO", "CMO", "COO"] },
  stock_critical: { title: "Critical Stock Situation", description: "Stok kritis di beberapa cabang — keputusan strategis supply chain", priority: "critical", requiredExecutives: ["COO", "CFO", "CEO"] },
  cashflow_crisis: { title: "Cashflow Crisis Management", description: "Cashflow negatif — langkah strategis untuk likuiditas", priority: "critical", requiredExecutives: ["CFO", "CEO", "COO"] },
  expansion: { title: "Branch Expansion Feasibility", description: "Evaluasi kelayakan ekspansi cabang baru", priority: "high", requiredExecutives: ["CEO", "CFO", "COO", "CMO"] },
  supplier_evaluation: { title: "Supplier Chain Evaluation", description: "Evaluasi performa supplier dan strategi pengadaan", priority: "high", requiredExecutives: ["COO", "CFO"] },
  marketing_strategy: { title: "Marketing Strategy Review", description: "Review efektivitas campaign dan strategi marketing", priority: "high", requiredExecutives: ["CMO", "CEO", "CFO"] },
  hr_workforce: { title: "Workforce Planning", description: "Perencanaan tenaga kerja untuk ekspansi dan operasional", priority: "normal", requiredExecutives: ["CHRO", "COO", "CFO"] },
  technology: { title: "Technology Infrastructure Review", description: "Review sistem, keamanan, dan rencana pengembangan teknologi", priority: "normal", requiredExecutives: ["CTO", "CEO", "COO"] },
  risk_assessment: { title: "Corporate Risk Assessment", description: "Identifikasi dan mitigasi risiko bisnis", priority: "high", requiredExecutives: ["CEO", "COO", "CFO", "CAIO"] },
  innovation: { title: "Innovation & Improvement", description: "Diskusi inovasi produk, proses, dan strategi diferensiasi", priority: "normal", requiredExecutives: ["CEO", "CMO", "COO", "CAIO"] },
};
