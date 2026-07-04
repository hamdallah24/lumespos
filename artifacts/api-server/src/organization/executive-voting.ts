// ECP-042: Executive Voting — Yes/No/Abstain voting system
// CEO triggers vote. Each executive returns vote + reasoning.
// Result is computed from collected votes.

import type { ExecutiveRole } from "./executive-task";

export type VoteDecision = "YES" | "NO" | "ABSTAIN";

export interface ExecutiveVote {
  executive: ExecutiveRole;
  decision: VoteDecision;
  confidence: number;
  reasoning: string;
}

export interface VotingResult {
  question: string;
  yes: number;
  no: number;
  abstain: number;
  total: number;
  majority: VoteDecision | "DRAW";
  votes: ExecutiveVote[];
}

export class ExecutiveVoting {

  private activeVotes: Map<string, ExecutiveVote[]> = new Map();

  /** Start a new vote with a question */
  startVote(questionId: string): void {
    this.activeVotes.set(questionId, []);
  }

  /** Cast a vote */
  castVote(questionId: string, vote: ExecutiveVote): void {
    const votes = this.activeVotes.get(questionId);
    if (votes) {
      const existing = votes.findIndex(v => v.executive === vote.executive);
      if (existing >= 0) {
        votes[existing] = vote;
      } else {
        votes.push(vote);
      }
    }
  }

  /** Compute voting result */
  tallyVotes(questionId: string, question: string): VotingResult {
    const votes = this.activeVotes.get(questionId) || [];
    const yes = votes.filter(v => v.decision === "YES").length;
    const no = votes.filter(v => v.decision === "NO").length;
    const abstain = votes.filter(v => v.decision === "ABSTAIN").length;

    let majority: VoteDecision | "DRAW" = "DRAW";
    if (yes > no) majority = "YES";
    else if (no > yes) majority = "NO";

    this.activeVotes.delete(questionId);

    return {
      question,
      yes,
      no,
      abstain,
      total: votes.length,
      majority,
      votes: [...votes],
    };
  }
}

export const executiveVoting = new ExecutiveVoting();
