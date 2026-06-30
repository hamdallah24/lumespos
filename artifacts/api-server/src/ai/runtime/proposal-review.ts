// SPRINT 13: Proposal Review Runtime
// Validates proposals before Founder sees them — duplicate check, constitutional check, ADR check

import type { KnowledgeEvolutionProposal } from "./knowledge-evolution";
import type { EvidencePacket } from "./evidence-collector";

interface ReviewResult {
  approved: boolean;
  duplicate: boolean;
  constitutional: boolean;
  adrCompliant: boolean;
  evidenceSufficient: boolean;
  confidence: number;
  estimatedImpact: string;
  recommendation: "APPROVE" | "REVISE" | "REJECT";
  notes: string[];
}

/** Review a proposal against all governance rules */
export function review(
  proposal: KnowledgeEvolutionProposal,
  existingDocs: string[],
): ReviewResult {
  const notes: string[] = [];
  let score = 0;
  const max = 5;

  // Check 1: Duplicate?
  const isDuplicate = existingDocs.some(doc =>
    doc.toLowerCase().includes(proposal.targetFile.toLowerCase())
  );
  if (!isDuplicate) { score++; } else { notes.push("DUPLICATE: similar document exists"); }

  // Check 2: Constitutional?
  const constitutional = !/delete|drop|remove.*foundation|modify.*constitution/i.test(proposal.rationale);
  if (constitutional) { score++; } else { notes.push("CONSTITUTION: proposal may violate Foundation"); }

  // Check 3: Evidence sufficient?
  const evidenceSufficient = proposal.evidence.strength !== "weak";
  if (evidenceSufficient) { score++; } else { notes.push("EVIDENCE: insufficient — need more data"); }

  // Check 4: ADR compliant?
  const adrCompliant = proposal.proposedAction !== "create_adr"
    || proposal.rationale.length > 50;
  if (adrCompliant) { score++; } else { notes.push("ADR: rationale too short for ADR proposal"); }

  // Check 5: Risk acceptable?
  const riskOk = proposal.risk !== "high" || proposal.evidence.strength === "strong";
  if (riskOk) { score++; } else { notes.push("RISK: high risk with insufficient evidence"); }

  const confidence = Math.round((score / max) * 100);
  const estimatedImpact = proposal.proposedAction === "create_doc"
    ? `Knowledge +1 doc (${proposal.targetFile})`
    : proposal.proposedAction === "create_adr"
      ? "Architecture +1 ADR"
      : "Knowledge updated";

  return {
    approved: score >= 3,
    duplicate: isDuplicate,
    constitutional,
    adrCompliant,
    evidenceSufficient,
    confidence,
    estimatedImpact,
    recommendation: score >= 4 ? "APPROVE"
      : score >= 3 ? "REVISE"
      : "REJECT",
    notes,
  };
}

export const proposalReview = {
  name: "ProposalReview",
  version: "1.0.0",
  capabilities: ["proposal-validation", "duplicate-detection", "constitutional-check", "governance-gate"],
  dependencies: ["KnowledgeEvolution"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  review,
};
