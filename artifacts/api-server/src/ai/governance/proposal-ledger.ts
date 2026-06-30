// SPRINT 6: Proposal Ledger — immutable audit trail of all proposals

interface LedgerEntry {
  id: string;
  author: string;
  type: string;
  summary: string;
  evidence: string[];
  affectedAssets: string[];
  riskLevel: string;
  decision: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  rollback?: string;
  timestamp: string;
}

const _ledger: LedgerEntry[] = [];
const MAX_LEDGER = 1000;

export function record(entry: Omit<LedgerEntry, "timestamp">): LedgerEntry {
  const full: LedgerEntry = { ...entry, timestamp: new Date().toISOString() };
  _ledger.push(full);
  if (_ledger.length > MAX_LEDGER) _ledger.shift();
  console.log(`[Ledger] ${entry.decision} — ${entry.id}: ${entry.summary.slice(0, 80)}`);
  return full;
}

export function history(count = 20): LedgerEntry[] {
  return _ledger.slice(-count).reverse();
}

export function byAuthor(author: string): LedgerEntry[] {
  return _ledger.filter(e => e.author === author);
}

export function byType(type: string): LedgerEntry[] {
  return _ledger.filter(e => e.type === type);
}

export function pending(): LedgerEntry[] {
  return _ledger.filter(e => e.decision === "PENDING");
}

export const proposalLedger = {
  name: "ProposalLedger",
  version: "1.0.0",
  capabilities: ["audit-trail", "proposal-tracking", "historical-record"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
