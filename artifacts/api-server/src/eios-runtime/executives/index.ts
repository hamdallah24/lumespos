import { ExecutiveRegistry } from "../internal/runtime-metadata/ExecutiveRegistry";
import { defineExecutive } from "../contracts/Manifest";
import { parseComponentId } from "../contracts/ComponentId";

const NS = "eios.core";

function exId(name: string) {
  return parseComponentId(`${NS}:executive:${name}@1.0.0`);
}

interface ExecutiveDef {
  name: string;
  role: string;
  capabilities: string[];
  priority: number;
  authority: "full" | "limited" | "observer";
  councilMember: boolean;
}

const executives: ExecutiveDef[] = [
  { name: "CEO", role: "CEO", capabilities: ["strategy", "delegation", "executive_report"], priority: 100, authority: "full", councilMember: true },
  { name: "CTO", role: "CTO", capabilities: ["technical_review", "architecture", "code_review"], priority: 90, authority: "limited", councilMember: true },
  { name: "CFO", role: "CFO", capabilities: ["financial_analysis", "budget_review"], priority: 80, authority: "limited", councilMember: true },
  { name: "CMO", role: "CMO", capabilities: ["market_analysis", "customer_insight"], priority: 70, authority: "limited", councilMember: false },
  { name: "CAIO", role: "CAIO", capabilities: ["system_review", "ai_audit"], priority: 60, authority: "limited", councilMember: false },
  { name: "CKO", role: "CKO", capabilities: ["knowledge_curation", "documentation"], priority: 50, authority: "observer", councilMember: false },
  { name: "COO", role: "COO", capabilities: ["operations", "execution", "monitoring"], priority: 95, authority: "limited", councilMember: true },
  { name: "CHRO", role: "CHRO", capabilities: ["viewPersonnel", "scheduleShift", "generateHRReport"], priority: 75, authority: "limited", councilMember: false },
];

for (const ex of executives) {
  ExecutiveRegistry.register({
    id: exId(ex.name),
    manifest: defineExecutive({
      id: exId(ex.name),
      name: ex.name,
      description: `${ex.name} executive`,
      dependencies: [],
      capabilities: ex.capabilities,
      tags: ["core"],
      checksum: ex.name,
      schemaVersion: { major: 1, minor: 0, patch: 0 },
      deprecated: false,
      replacement: null,
      metadata: {},
    }),
    role: ex.role,
    capabilities: ex.capabilities,
    priority: ex.priority,
    authority: ex.authority,
    councilMember: ex.councilMember,
  });
}
