// SPRINT 15: Collaboration Runtime — agents work together
// Shared context, delegation chains, consensus voting, agent communication

import type { AgentIdentity } from "./identity";
import { delegate, accept, complete as completeTask, pendingTasks } from "./organization-runtime";
import { getTrust } from "./trust-runtime";

interface CollaborationSession {
  id: string;
  objective: string;
  participants: string[];    // Agent IDs
  leader: string;            // Who initiated
  tasks: string[];           // Task IDs delegated within this session
  sharedContext: string[];   // Agent-to-agent messages
  status: "active" | "completed" | "failed";
  result?: string;
  startedAt: string;
}

interface ConsensusVote {
  task: string;
  voter: string;
  vote: "approve" | "reject" | "revise";
  reason: string;
}

const _sessions: CollaborationSession[] = [];
const _votes: Record<string, ConsensusVote[]> = {};
const MAX_SESSIONS = 50;

/** Start a collaboration session */
export function startSession(
  leader: AgentIdentity,
  objective: string,
  participants: AgentIdentity[],
): CollaborationSession {
  const session: CollaborationSession = {
    id: `collab_${Date.now()}`,
    objective,
    participants: participants.map(p => p.id),
    leader: leader.id,
    tasks: [],
    sharedContext: [],
    status: "active",
    startedAt: new Date().toISOString(),
  };

  _sessions.push(session);
  if (_sessions.length > MAX_SESSIONS) _sessions.shift();

  // Delegate subtasks to each participant
  for (const agent of participants) {
    const task = delegate(leader, agent, objective, "normal");
    session.tasks.push(task.id);
    accept(task.id);
  }

  console.log(`[Collaboration] ${leader.role} started session "${objective}" with ${participants.map(p => p.role).join(", ")}`);
  return session;
}

/** Share context between agents */
export function share(sessionId: string, from: AgentIdentity, message: string): void {
  const session = _sessions.find(s => s.id === sessionId);
  if (!session) return;
  session.sharedContext.push(`[${from.role}]: ${message}`);
}

/** Vote on a proposal within a collaboration */
export function vote(voter: AgentIdentity, task: string, vote: ConsensusVote["vote"], reason: string): void {
  if (!_votes[task]) _votes[task] = [];
  _votes[task].push({ task, voter: voter.id, vote, reason });

  console.log(`[Consensus] ${voter.role} → ${vote}: ${task} (${reason})`);
}

/** Check if consensus is reached */
export function consensus(task: string): { reached: boolean; decision?: "approve" | "reject"; tally: Record<string, number> } {
  const votes = _votes[task] || [];
  const tally = { approve: 0, reject: 0, revise: 0 };
  for (const v of votes) tally[v.vote]++;

  const total = tally.approve + tally.reject + tally.revise;
  if (total === 0) return { reached: false, tally };

  return {
    reached: tally.approve > tally.reject,
    decision: tally.approve > tally.reject ? "approve" : "reject",
    tally,
  };
}

/** Complete a collaboration session with final result */
export function finishSession(sessionId: string, result: string, success: boolean): void {
  const session = _sessions.find(s => s.id === sessionId);
  if (!session) return;
  session.status = success ? "completed" : "failed";
  session.result = result;

  // Complete all delegated tasks
  for (const taskId of session.tasks) {
    completeTask(taskId, `Collaboration result: ${result}`);
  }
}

/** Get active collaboration sessions */
export function activeSessions(): CollaborationSession[] {
  return _sessions.filter(s => s.status === "active");
}

/** Route a complex task through collaboration */
export function collaborate(
  commander: AgentIdentity,
  objective: string,
  availableAgents: AgentIdentity[],
): CollaborationSession {
  // Select best agents by trust score
  const ranked = availableAgents
    .filter(a => a.id !== commander.id)
    .map(a => ({ agent: a, trust: getTrust(a.id) }))
    .sort((a, b) => b.trust - a.trust);

  // Take top 3 agents (or all if fewer)
  const participants = ranked.slice(0, 3).map(r => r.agent);

  return startSession(commander, objective, participants);
}

export const collaborationRuntime = {
  name: "CollaborationRuntime",
  version: "1.0.0",
  capabilities: ["multi-agent-collaboration", "consensus-voting", "context-sharing", "task-routing"],
  dependencies: ["OrganizationRuntime", "TrustRuntime", "IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  session: startSession,
  share,
  vote,
  consensus,
  finish: finishSession,
  active: activeSessions,
  collaborate,
};
