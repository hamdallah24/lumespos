import type { CouncilVote, CouncilMember, VoteType } from "./types";

let counter = 0;

function nextId(): string {
  counter++;
  return `vote-${Date.now()}-${counter}`;
}

export function createVote(agendaItemId: string, voteType: VoteType, members: CouncilMember[]): CouncilVote {
  return {
    id: nextId(),
    agendaItemId,
    voteType,
    votes: [],
    result: "tie",
    tally: { approve: 0, reject: 0, abstain: 0, weightedApprove: 0, weightedReject: 0 },
    finishedAt: "",
  };
}

export function castVote(vote: CouncilVote, executive: string, choice: "approve" | "reject" | "abstain", members: CouncilMember[], reason?: string): CouncilVote {
  const member = members.find(m => m.executive === executive);
  const weight = member?.votingWeight || 1;
  const newVotes = [...vote.votes, { executive, choice, weight, reason }];
  return { ...vote, votes: newVotes, tally: computeTally(newVotes) };
}

export function finalizeVote(vote: CouncilVote): CouncilVote {
  const tally = computeTally(vote.votes);
  let result: CouncilVote["result"];
  switch (vote.voteType) {
    case "unanimous":
      result = tally.reject === 0 && tally.abstain === 0 ? "approved" : "rejected";
      break;
    case "weighted":
      result = tally.weightedApprove > tally.weightedReject ? "approved" : tally.weightedApprove < tally.weightedReject ? "rejected" : "tie";
      break;
    case "founder_override":
      const founderVote = vote.votes.find(v => v.executive === "Founder");
      result = founderVote?.choice === "approve" ? "approved" : founderVote?.choice === "reject" ? "rejected" : "tie";
      break;
    case "simple_majority":
    default:
      result = tally.approve > tally.reject ? "approved" : tally.approve < tally.reject ? "rejected" : "tie";
      break;
  }
  return { ...vote, tally, result, finishedAt: new Date().toISOString() };
}

function computeTally(votes: CouncilVote["votes"]): CouncilVote["tally"] {
  let approve = 0, reject = 0, abstain = 0;
  let weightedApprove = 0, weightedReject = 0;
  for (const v of votes) {
    if (v.choice === "approve") { approve++; weightedApprove += v.weight; }
    else if (v.choice === "reject") { reject++; weightedReject += v.weight; }
    else abstain++;
  }
  return { approve, reject, abstain, weightedApprove, weightedReject };
}

export function determineVoteType(members: CouncilMember[], hasFounderOverride: boolean): VoteType {
  if (hasFounderOverride) return "founder_override";
  if (members.every(m => m.present)) return "unanimous";
  if (members.some(m => m.votingWeight >= 3)) return "weighted";
  return "simple_majority";
}
