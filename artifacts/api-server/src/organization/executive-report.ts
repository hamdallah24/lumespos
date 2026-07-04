// ECP-042: Executive Report — Output format + CEO synthesis
// CEO adalah satu-satunya komponen yang menyusun Executive Board Report.
// Engine hanya mengumpulkan. CEO mensintesis via callDeepSeek.

import type { ExecutiveRole, ExecutiveResult } from "./executive-task";
import type { VotingResult } from "./executive-voting";
import type { DebateMessage } from "./executive-debate";

export interface RiskItem {
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reportedBy: ExecutiveRole;
}

export interface ActionItem {
  action: string;
  owner: ExecutiveRole;
  deadline?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface ExecutiveOpinion {
  executive: ExecutiveRole;
  content: string;
  confidence: number;
}

export interface ExecutiveBoardReport {
  title: string;
  objective: string;
  executiveOpinions: ExecutiveOpinion[];
  votingResult?: VotingResult;
  debateTranscript?: DebateMessage[];
  risks: RiskItem[];
  finalDecision: string;
  actionItems: ActionItem[];
  generatedBy: "CEO";
  generatedAt: string;
}

/** Build report structure from collected executive results — NO synthesis */
export function buildReportStructure(
  title: string,
  objective: string,
  results: ExecutiveResult[],
  votingResult?: VotingResult,
  debateTranscript?: DebateMessage[],
  risks: RiskItem[] = [],
  actionItems: ActionItem[] = [],
): ExecutiveBoardReport {
  return {
    title,
    objective,
    executiveOpinions: results.map(r => ({
      executive: r.executive,
      content: r.content,
      confidence: r.confidence,
    })),
    votingResult,
    debateTranscript,
    risks,
    finalDecision: "",   // Diisi oleh CEO setelah sintesis
    actionItems,         // Diisi oleh CEO setelah analisis
    generatedBy: "CEO",
    generatedAt: new Date().toISOString(),
  };
}

/** CEO synthesis prompt — for use with callDeepSeek */
export function buildCEOSynthesisPrompt(report: ExecutiveBoardReport): string {
  const opinions = report.executiveOpinions
    .map(o => `[${o.executive}] (confidence: ${o.confidence}%): ${o.content.slice(0, 500)}`)
    .join("\n\n");

  const voteSection = report.votingResult
    ? `\n## Voting\nYES: ${report.votingResult.yes} | NO: ${report.votingResult.no} | ABSTAIN: ${report.votingResult.abstain}\nMajority: ${report.votingResult.majority}`
    : "";

  const riskSection = report.risks.length > 0
    ? `\n## Risks\n${report.risks.map(r => `- ${r.severity}: ${r.description} (${r.reportedBy})`).join("\n")}`
    : "";

  return `## Executive Board Report Synthesis

Objective: ${report.objective}

## Executive Opinions
${opinions}${voteSection}${riskSection}

Sebagai CEO, sintesis seluruh pendapat di atas menjadi satu Executive Board Report dengan format:

## Executive Board Report

### Ringkasan Eksekutif
### Keputusan Final
### Risiko
### Action Items
- Action: [deskripsi] | Owner: [executive] | Priority: [LOW/MEDIUM/HIGH/CRITICAL] | Deadline: [opsional]
`;
}
