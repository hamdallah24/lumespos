// ECP-033: Conflict Resolver — resolves dissenting opinions
// Frozen. When CEO says YES and CTO says NO, conflict resolution begins.

import type { CouncilOpinion, CouncilSession } from "./types";
import { createOpinion } from "./opinion";

class ConflictResolver {
  resolve(session: CouncilSession): { resolved: boolean; recommendation: string; newOpinions: CouncilOpinion[] } {
    const approve = session.opinions.filter(o => o.recommendation === "APPROVE" || o.recommendation === "MODIFY");
    const reject = session.opinions.filter(o => o.recommendation === "REJECT");

    if (reject.length === 0) {
      return { resolved: true, recommendation: "APPROVE", newOpinions: [] };
    }

    // Conflict: produce clarification opinion
    const newOpinions: CouncilOpinion[] = [];

    // Request Consultant to weigh in with evidence
    const consultantOpinion = createOpinion(
      session.id, "Consultant", "MODIFY", 85,
      `Conflict detected: ${approve.length} approve vs ${reject.length} reject. ` +
      `Review risks from rejecting participants: ${reject.map(o => o.risks.join(", ")).join("; ")}`,
      reject.flatMap(o => o.evidenceIds),
      reject.flatMap(o => o.risks),
      ["Proceed with modified plan"],
    );
    newOpinions.push(consultantOpinion);

    return {
      resolved: false,
      recommendation: "MODIFY",
      newOpinions,
    };
  }
}

export const conflictResolver = new ConflictResolver();
