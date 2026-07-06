// ECP-014R Stage 2: Finding Builder
// Converts EvidenceItems + LLM reasoning into structured Findings.
// Deterministic mapping. Reasoning is LLM's job. FindingBuilder just structures it.
// Located in src/runtime/reasoning/ — NOT src/metrics/.

import type { Finding, FindingSeverity, EvidenceItem, EvidenceGraph, EvidenceEdge } from "../EvidenceTypes";
import { createFindingId } from "../EvidenceTypes";

export interface FindingInput {
  title: string;
  statement: string;
  severity: FindingSeverity;
  evidence: EvidenceItem[];
  recommendation: string;
}

export class FindingBuilder {

  /** Build a single finding from evidence + reasoning */
  build(input: FindingInput): Finding {
    return {
      id: createFindingId(),
      title: input.title,
      statement: input.statement,
      severity: input.severity,
      evidenceIds: input.evidence.map(e => e.id),
      recommendation: input.recommendation,
    };
  }

  /** Build multiple findings from a batch */
  buildAll(inputs: FindingInput[]): Finding[] {
    return inputs.map(i => this.build(i));
  }

  /** Build evidence graph from evidence items (deterministic, v1 rules) */
  buildGraph(evidence: EvidenceItem[]): EvidenceGraph {
    const edges: EvidenceEdge[] = [];
    const nodes = [...evidence];

    for (let i = 0; i < evidence.length; i++) {
      const a = evidence[i];

      // Rule 1: sequential dependency via parentEvidenceId
      if (a.parentEvidenceId && evidence.some(e => e.id === a.parentEvidenceId)) {
        edges.push({ sourceId: a.parentEvidenceId, targetId: a.id, reason: "sequential_dependency" });
      }

      for (let j = i + 1; j < evidence.length; j++) {
        const b = evidence[j];

        // Rule 2: same source
        if (a.source === b.source) {
          edges.push({ sourceId: a.id, targetId: b.id, reason: "same_source" });
        }

        // Rule 3: explicit reference in content
        if (a.content.includes(b.source) || b.content.includes(a.source)) {
          edges.push({ sourceId: a.id, targetId: b.id, reason: "explicit_reference" });
        }
      }
    }

    return { nodes, edges };
  }
}

export const findingBuilder = new FindingBuilder();
