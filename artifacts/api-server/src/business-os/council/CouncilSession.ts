import type { CouncilSession, CouncilMember, CouncilStatus, MeetingType } from "./types";

let counter = 0;

function nextId(): string {
  counter++;
  return `csl-${Date.now()}-${counter}`;
}

const DEFAULT_MEMBERS: CouncilMember[] = [
  { executive: "CEO", present: true, votingWeight: 3, required: true, responsibility: "Strategic direction, final approval" },
  { executive: "COO", present: true, votingWeight: 2, required: true, responsibility: "Operations, supply chain, production" },
  { executive: "CFO", present: true, votingWeight: 2, required: true, responsibility: "Finance, budget, cash flow" },
  { executive: "CMO", present: true, votingWeight: 1, required: false, responsibility: "Marketing, sales, brand" },
  { executive: "CHRO", present: true, votingWeight: 1, required: false, responsibility: "People, HR, culture" },
  { executive: "CTO", present: true, votingWeight: 1, required: false, responsibility: "Technology, infrastructure" },
  { executive: "CAIO", present: true, votingWeight: 1, required: false, responsibility: "AI systems, automation" },
  { executive: "CKO", present: true, votingWeight: 1, required: false, responsibility: "Knowledge, learning" },
];

export function createSession(title: string, reason: string, trigger: string, meetingType: MeetingType = "manual", createdBy?: string): CouncilSession {
  return {
    sessionId: nextId(),
    title,
    reason,
    trigger,
    meetingType,
    status: "CREATED",
    executives: DEFAULT_MEMBERS.map(m => ({ ...m })),
    agenda: [],
    decisions: [],
    votes: [],
    confidence: 0,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

export function setStatus(session: CouncilSession, status: CouncilStatus): CouncilSession {
  const now = new Date().toISOString();
  return {
    ...session,
    status,
    startedAt: status === "DISCUSSING" ? (session.startedAt || now) : session.startedAt,
    finishedAt: status === "FINISHED" || status === "CANCELLED" ? now : session.finishedAt,
    durationMs: status === "FINISHED" || status === "CANCELLED" ? Date.now() - new Date(session.createdAt).getTime() : session.durationMs,
  };
}

export function markMemberPresent(session: CouncilSession, executive: string, present: boolean): CouncilSession {
  return {
    ...session,
    executives: session.executives.map(m => m.executive === executive ? { ...m, present, joinedAt: present ? new Date().toISOString() : m.joinedAt } : m),
  };
}

export const EMERGENCY_SESSIONS: Record<string, { title: string; reason: string; members: string[] }> = {
  profit_drop: { title: "Council: Profit Drop Emergency", reason: "Profit turun di bawah target — memerlukan evaluasi strategis lintas fungsi", members: ["CEO", "COO", "CFO"] },
  revenue_crash: { title: "Council: Revenue Crash", reason: "Revenue turun drastis — analisis penyebab dan rencana pemulihan", members: ["CEO", "CMO", "CFO", "COO"] },
  cashflow_crisis: { title: "Council: Cashflow Crisis", reason: "Cashflow negatif — keputusan strategis untuk likuiditas", members: ["CEO", "CFO", "COO"] },
  supplier_failure: { title: "Council: Supplier Chain Failure", reason: "Supplier gagal total — dampak pada operasi dan solusi", members: ["COO", "CFO", "CEO"] },
  stock_critical: { title: "Council: Stock Critical", reason: "Stok kritis di banyak cabang — keputusan strategis supply chain", members: ["COO", "CFO", "CEO"] },
  expansion: { title: "Council: Expansion Planning", reason: "Rencana ekspansi cabang baru — evaluasi kelayakan dan strategi", members: ["CEO", "COO", "CFO", "CMO"] },
  mass_recruitment: { title: "Council: Mass Recruitment", reason: "Rekrutmen massal — dampak pada budget, operasi, dan kultur", members: ["CHRO", "CFO", "COO", "CEO"] },
  system_outage: { title: "Council: System Outage", reason: "Sistem utama down — dampak bisnis dan rencana pemulihan", members: ["CTO", "COO", "CEO"] },
};
