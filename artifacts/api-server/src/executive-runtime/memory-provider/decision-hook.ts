import { memoryProvider } from "./MemoryProvider";
import type { ExecutiveRole } from "../cognition/CognitiveContracts";
import type { ThinkResult } from "../cognition/CognitiveEngine";

export async function writeDecisionToMemory(
  role: ExecutiveRole,
  query: string,
  result: ThinkResult | null,
): Promise<void> {
  if (!result) return;
  try {
    await memoryProvider.write({
      content: `[${role}] ${result.decision.chosenAlternative.label}: ${result.decision.reasoning.slice(0, 500)}`,
      executive: role,
      category: "decision",
      scope: role === "CEO" || role === "CKO" ? "GLOBAL" : role,
      source: "cognitive-engine",
      tags: [role.toLowerCase(), "decision", result.decision.chosenAlternative.label],
      confidence: result.decision.confidence.overall / 100,
      executivePriority: result.decision.confidence.overall,
      isUserExplicit: false,
    });
  } catch {
    // non-critical path — silent fail
  }
}
