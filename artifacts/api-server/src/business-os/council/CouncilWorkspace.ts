import type { CouncilSession, CorporateDecision } from "./types";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export function syncDecisionsToWorkspace(session: CouncilSession): void {
  for (const decision of session.decisions) {
    for (const exec of decision.executives) {
      ExecutiveWorkspaceManager.recordDecision(exec, decision.decisionId, decision.title, decision.reasoning, decision.confidence, {}, "system");
    }

    if (decision.executionPlan) {
      for (const plan of decision.executionPlan) {
        ExecutiveWorkspaceManager.addTask(plan.responsible, plan.action, `Council: ${decision.title}`, decision.priority, session.sessionId, undefined, true);
      }
    }
  }
}

export function syncObjectivesFromCouncil(session: CouncilSession): void {
  for (const agenda of session.agenda) {
    if (agenda.status === "resolved" && agenda.resolution) {
      for (const exec of agenda.requiredExecutives) {
        ExecutiveWorkspaceManager.addObjective(exec, `Council: ${agenda.title}`, agenda.resolution.slice(0, 200), agenda.priority);
      }
    }
  }
}

export function syncAgendaToTask(session: CouncilSession): void {
  for (const agenda of session.agenda) {
    if (agenda.status === "resolved") {
      for (const exec of agenda.requiredExecutives) {
        ExecutiveWorkspaceManager.addTask(exec, `Follow up: ${agenda.title}`, `Council session ${session.sessionId}: ${agenda.resolution?.slice(0, 200) || agenda.description.slice(0, 200)}`, "normal", session.sessionId, undefined, true);
      }
    }
  }
}

export function addCouncilReminder(executive: string, title: string, dueAt: string): void {
  ExecutiveWorkspaceManager.addReminder(executive, title, dueAt, `Council action item: ${title}`);
}

export function recordCouncilDiscussion(executive: string, message: string, response: string): void {
  ExecutiveWorkspaceManager.recordDiscussion(executive, message, response, "system");
}
