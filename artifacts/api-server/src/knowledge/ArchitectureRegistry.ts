// RFC-012 Phase 10D: Architecture Registry
// Wraps ADR documents and architecture rules. Static knowledge.

export interface ADREntry {
  id: string;
  title: string;
  status: "ACCEPTED" | "PROPOSED" | "DEPRECATED";
  summary: string;
  path: string;
}

const ADR_LIST: ADREntry[] = [
  { id: "ADR-001", title: "Foundation v2.0", status: "ACCEPTED", summary: "Foundation freeze. Extension-only architecture.", path: "docs/architecture/ADR-001-foundation-v2.md" },
  { id: "ADR-002", title: "Governor SSOT", status: "ACCEPTED", summary: "ExecutionGovernor is single source of truth for execution policy.", path: "docs/architecture/ADR-002-governor-ssot.md" },
  { id: "ADR-003", title: "Pipeline Ownership", status: "ACCEPTED", summary: "ExecutionDriver owns lifecycle. LLM adapter is stateless.", path: "docs/architecture/ADR-003-pipeline-ownership.md" },
  { id: "ADR-004", title: "Runtime Purity", status: "ACCEPTED", summary: "Runtime = executor only. Reads contract, no policy decisions.", path: "docs/architecture/ADR-004-runtime-purity.md" },
  { id: "ADR-005", title: "AI Facade", status: "ACCEPTED", summary: "ai-helpers.ts → barrel → src/ai/index.ts migration plan.", path: "docs/architecture/ADR-005-ai-facade.md" },
  { id: "ADR-006", title: "Organization Layer", status: "ACCEPTED", summary: "SSOT dispatcher + registry for executive collaboration.", path: "docs/architecture/ADR-006-organization-layer.md" },
  { id: "ADR-007", title: "Learning Layer", status: "ACCEPTED", summary: "Experience → Reflection → Knowledge → Retrieval.", path: "docs/architecture/ADR-007-learning-layer.md" },
  { id: "ADR-008", title: "Governance Layer", status: "ACCEPTED", summary: "Self-auditing organization with policy engine.", path: "docs/architecture/ADR-008-governance-layer.md" },
  { id: "ADR-010", title: "Mission Resource Architecture", status: "ACCEPTED", summary: "Hierarchical budgeting, compression, evidence-driven governance.", path: "docs/architecture/ADR-010-mission-resource-architecture.md" },
];

export class ArchitectureRegistry {

  /** Find ADR by ID */
  findADR(id: string): ADREntry | null {
    return ADR_LIST.find(a => a.id === id) || null;
  }

  /** Get all architecture rules */
  rules(): string[] {
    return [
      "Foundation frozen — only bug fixes allowed without ADR",
      "Governor instantiated ONLY in ExecutionDriver",
      "Runtime = pure executor, reads ExecutionContract",
      "LLM Adapter = stateless, no Governor references",
      "Tool Adapter = stateless, no policy",
      "Organization Engine = SSOT dispatcher",
      "Knowledge Backbone = unified access layer, wraps registries",
      "Mission Budget = hierarchical, observed by BudgetTracker",
      "Evidence-driven completion — not token-driven",
    ];
  }

  /** Search ADRs by keyword */
  search(query: string): ADREntry[] {
    const lower = query.toLowerCase();
    return ADR_LIST.filter(a =>
      a.title.toLowerCase().includes(lower) ||
      a.summary.toLowerCase().includes(lower) ||
      a.id.toLowerCase().includes(lower)
    );
  }

  /** Get all ADRs */
  all(): ADREntry[] {
    return [...ADR_LIST];
  }
}

export const architectureRegistry = new ArchitectureRegistry();
