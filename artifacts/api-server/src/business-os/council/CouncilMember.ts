import type { CouncilMember } from "./types";
import { executiveReason } from "../../ai/runtime/execution/ExecutiveReasoner";

export function getRequiredMembers(executives: string[]): CouncilMember[] {
  return executives.map((exec, i) => ({
    executive: exec,
    present: true,
    votingWeight: getDefaultWeight(exec),
    required: true,
    responsibility: getResponsibility(exec),
  }));
}

function getDefaultWeight(executive: string): number {
  const weights: Record<string, number> = { CEO: 3, COO: 2, CFO: 2, CMO: 1, CHRO: 1, CTO: 1, CAIO: 1, CKO: 1 };
  return weights[executive] || 1;
}

function getResponsibility(executive: string): string {
  const resp: Record<string, string> = {
    CEO: "Strategic direction, final approval",
    COO: "Operations, supply chain, production",
    CFO: "Finance, budget, cash flow",
    CMO: "Marketing, sales, brand",
    CHRO: "People, HR, culture",
    CTO: "Technology, infrastructure",
    CAIO: "AI systems, automation, intelligence",
    CKO: "Knowledge, learning, best practices",
  };
  return resp[executive] || "Advisory";
}

export function generateMemberPrompt(executive: string, agendaTitle: string, agendaDescription: string): string {
  return `Kamu adalah **${executive}** dalam rapat direksi Lume's Everywhere.

Agenda: ${agendaTitle}
Deskripsi: ${agendaDescription}

Berikan opini sebagai ${executive} dengan format:

OPINION: [pendapatmu]
REASONING: [alasan]
EVIDENCE: [data yang mendukung]
CONFIDENCE: [0-100]
RISKS: [daftar risiko]
ALTERNATIVES: [alternatif solusi]
RECOMMENDATION: [rekomendasi konkret]`;
}

export async function collectOpinion(executive: string, agendaTitle: string, agendaDescription: string, contextData?: string): Promise<{ opinion: string; reasoning: string; evidence: string; confidence: number; risks: string[]; alternatives: string[]; recommendation: string } | null> {
  try {
    const prompt = generateMemberPrompt(executive, agendaTitle, agendaDescription);
    const fullContext = contextData ? `${prompt}\n\nContext:\n${contextData}` : prompt;
    const result = await executiveReason({ persona: fullContext, context: `Berikan opini sebagai ${executive} untuk agenda: ${agendaTitle}`, userId: 0 });
    return parseOpinion(result.content);
  } catch {
    return null;
  }
}

function parseOpinion(text: string): { opinion: string; reasoning: string; evidence: string; confidence: number; risks: string[]; alternatives: string[]; recommendation: string } | null {
  try {
    const extract = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.+?)(?:\\n(?:[A-Z_]+):|$)`, "is");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };
    const extractList = (label: string): string[] => {
      const section = extract(label);
      return section ? section.split("\n").map(s => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean) : [];
    };
    return {
      opinion: extract("OPINION") || text.slice(0, 200),
      reasoning: extract("REASONING") || "",
      evidence: extract("EVIDENCE") || "",
      confidence: Math.min(100, Math.max(0, parseInt(extract("CONFIDENCE")) || 70)) / 100,
      risks: extractList("RISKS"),
      alternatives: extractList("ALTERNATIVES"),
      recommendation: extract("RECOMMENDATION") || "",
    };
  } catch {
    return null;
  }
}
