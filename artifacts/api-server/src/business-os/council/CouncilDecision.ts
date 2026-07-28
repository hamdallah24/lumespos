import type { CorporateDecision, CouncilSession, CouncilAgendaItem, CouncilConsensus } from "./types";

let counter = 0;

function nextId(): string {
  counter++;
  return `cd-${Date.now()}-${counter}`;
}

export function createCorporateDecision(
  session: CouncilSession,
  agendaItem: CouncilAgendaItem,
  decision: string,
  reasoning: string,
  confidence: number,
  dissenting: string[],
  alternatives: string[],
  risks: string[],
  requiresApproval: boolean = false,
  approvalLevel?: string,
  executionPlan?: CorporateDecision["executionPlan"],
): CorporateDecision {
  return {
    decisionId: nextId(),
    sessionId: session.sessionId,
    agendaItemId: agendaItem.id,
    title: agendaItem.title,
    decision,
    reasoning,
    alternatives,
    risks,
    executives: session.executives.filter(m => m.present).map(m => m.executive),
    confidence,
    priority: agendaItem.priority,
    requiresApproval,
    approvalLevel,
    dissenting,
    executionPlan,
    createdAt: new Date().toISOString(),
  };
}

export function fromConsensus(session: CouncilSession, agendaItem: CouncilAgendaItem, consensus: CouncilConsensus): CorporateDecision {
  return createCorporateDecision(
    session,
    agendaItem,
    consensus.mergedOpinion,
    consensus.mergedReasoning,
    consensus.confidence,
    consensus.dissenters,
    agendaItem.discussion.flatMap(o => o.alternatives),
    agendaItem.discussion.flatMap(o => o.risks),
    consensus.confidence < 0.7,
    consensus.confidence < 0.5 ? "ceo" : undefined,
  );
}

export function getExecutionActions(decision: CorporateDecision): { action: string; module: string; parameters: Record<string, unknown> }[] {
  if (decision.executionPlan) {
    return decision.executionPlan.map(e => ({
      action: e.action,
      module: mapActionToModule(e.action),
      parameters: { ...e.parameters, responsible: e.responsible },
    }));
  }
  return [];
}

function mapActionToModule(action: string): string {
  const moduleMap: Record<string, string> = {
    restock: "inventory", purchase: "purchasing", adjust_price: "product",
    add_product: "product", deactivate_product: "product", add_expense: "finance",
    produce: "production", close_shift: "shift", transfer_stock: "inventory",
  };
  return moduleMap[action] || "general";
}
