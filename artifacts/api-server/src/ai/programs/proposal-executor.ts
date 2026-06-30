// Phase 2: Proposal Executor — converts approved proposals to ExecutionSpec
// Separate from CTO Runtime (Single Responsibility). Proposal → Spec → CTO.

import { buildSpecV1 } from "../runtime/execution-spec";
import ctoProgram from "./cto-runtime";

/** Execute an approved proposal through the governed CTO Runtime pipeline */
export async function executeApprovedProposal(
  proposalId: string,
  onProgress?: (msg: string) => void,
): Promise<{ success: boolean; text: string; specId?: string }> {
  // Build a minimal spec representing the proposal execution
  const spec = buildSpecV1({
    intent: "implement_change",
    problem: `Execute approved proposal: ${proposalId}`,
    domain: "general",
    entities: [proposalId],
    confidence: 85,
    risk: "low",
    requiredCapabilities: ["readFiles", "searchCode", "editCode"],
    missingContext: [],
  });

  // Route through CTO Runtime — full governed pipeline
  try {
    const result = await ctoProgram.execute({
      message: `Execute approved proposal ${proposalId} with full context from proposal store.`,
      userId: 0,
      onProgress,
    });

    return {
      success: result.success,
      text: result.text,
      specId: spec.id,
    };
  } catch (e: any) {
    return { success: false, text: `Proposal execution failed: ${e.message}` };
  }
}

export const proposalExecutor = {
  name: "ProposalExecutor",
  version: "1.0.0",
  capabilities: ["proposal-execution", "spec-builder", "governed-implementation"],
  dependencies: ["CTOProgram", "ExecutionSpecificationV1"],

  execute: executeApprovedProposal,

  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
