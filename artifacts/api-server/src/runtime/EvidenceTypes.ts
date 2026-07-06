// ECP-014R: Evidence Types — structured evidence pipeline
// EvidenceItem, Finding, ValidatedFinding, EvidenceGraph.
// All findings must have at least one evidence. No orphan findings.

export type EvidenceType = "file_read" | "command_output" | "search_result" | "api_response";

export type FindingSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  source: string;
  lineRange?: [number, number];
  content: string;
  timestamp: string;
  parentEvidenceId?: string;
}

export interface Finding {
  id: string;
  title: string;
  statement: string;
  severity: FindingSeverity;
  evidenceIds: string[];
  recommendation: string;
}

export interface ValidatedFinding {
  finding: Finding;
  confidence: number;
  status: "validated" | "unvalidated";
  validatedAt: string;
}

export interface EvidenceEdge {
  sourceId: string;
  targetId: string;
  reason: "same_source" | "explicit_reference" | "sequential_dependency";
}

export interface EvidenceGraph {
  nodes: EvidenceItem[];
  edges: EvidenceEdge[];
}

let _evidenceCounter = 0;
let _findingCounter = 0;

export function createEvidenceId(): string { _evidenceCounter++; return `EVID-${Date.now().toString(36)}-${_evidenceCounter}`; }
export function createFindingId(): string { _findingCounter++; return `FIND-${Date.now().toString(36)}-${_findingCounter}`; }
