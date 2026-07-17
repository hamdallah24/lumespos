// Phase 2: Proposal Executor — converts approved proposals to execution
// Proposal data → SemanticContract → ExecutionSpec → CTO Runtime pipeline.
// Single entry point for any approved proposal, regardless of source.

import { buildSpecV1 } from "../runtime/execution-spec";
import { getRuntimeGateway } from "../runtime/RuntimeGateway";

export interface ProposalInput {
  id: string;
  title: string;
  description: string;
  targetFiles?: string[];
  rationale?: string;
  impact?: string;
  risk?: "low" | "medium" | "high";
  requiredCapabilities?: string[];
}

export interface ProposalExecutionResult {
  success: boolean;
  text: string;
  specId: string;
}

/** Execute an approved proposal through the governed CTO Runtime pipeline */
export async function executeApprovedProposal(
  proposal: ProposalInput,
  onProgress?: (msg: string) => void,
): Promise<ProposalExecutionResult> {
  const domain = detectDomain(proposal.title, proposal.description);
  const targetFiles = proposal.targetFiles || [];
  const capabilities = proposal.requiredCapabilities || ["readFiles", "searchCode", "editCode"];

  const spec = buildSpecV1({
    intent: "implement_change",
    problem: proposal.description,
    domain,
    entities: [proposal.id, proposal.title],
    targetFiles,
    confidence: 85,
    risk: proposal.risk || "low",
    requiredCapabilities: capabilities,
    missingContext: [],
  });

  const ctxParts = [
    `## Approved Proposal: ${proposal.title}`,
    `ID: ${proposal.id}`,
    `Description: ${proposal.description}`,
  ];
  if (proposal.rationale) ctxParts.push(`Rationale: ${proposal.rationale}`);
  if (proposal.impact) ctxParts.push(`Expected Impact: ${proposal.impact}`);
  if (targetFiles.length > 0) ctxParts.push(`Target Files:\n${targetFiles.map(f => `- ${f}`).join("\n")}`);

  try {
    const result = await getRuntimeGateway().assemble({
      target: "CTO",
      message: ctxParts.join("\n"),
      userId: 0,
      onProgress,
    });

    return {
      success: result.success,
      text: result.text,
      specId: spec.id,
    };
  } catch (e: any) {
    return {
      success: false,
      text: `Proposal execution failed: ${e?.message || "unknown"}`,
      specId: spec.id,
    };
  }
}

function detectDomain(title: string, description: string): string {
  const lower = `${title} ${description}`.toLowerCase();
  if (/\b(code|bug|refactor|api|backend|frontend|deploy|server)\b/.test(lower)) return "code";
  if (/\b(architecture|design|pattern|structure)\b/.test(lower)) return "architecture";
  if (/\b(inventory|sales|report|business|ops)\b/.test(lower)) return "business";
  if (/\b(budget|finance|accounting|audit|cost)\b/.test(lower)) return "finance";
  if (/\b(policy|governance|foundation|directive)\b/.test(lower)) return "governance";
  if (/\b(test|qa|quality|verify)\b/.test(lower)) return "qa";
  return "general";
}

export const proposalExecutor = {
  name: "ProposalExecutor",
  version: "1.0.0",
  capabilities: ["proposal-execution", "spec-builder", "governed-implementation"],
  dependencies: ["CTOProgram", "ExecutionSpecificationV1"],
  execute: executeApprovedProposal,
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
