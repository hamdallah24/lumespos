import { CapabilityRegistry } from "../internal/runtime-metadata/CapabilityRegistry";
import { parseComponentId } from "../contracts/ComponentId";

const NS = "eios.core";

function capId(name: string) {
  return parseComponentId(`${NS}:capability:${name}@1.0.0`);
}

const SYSTEM = parseComponentId(`${NS}:system@1.0.0`);

const capabilities = [
  { name: "strategy", provider: SYSTEM, priority: 100, cost: 10, latency: 2000 },
  { name: "delegation", provider: SYSTEM, priority: 100, cost: 5, latency: 500 },
  { name: "executive_report", provider: SYSTEM, priority: 90, cost: 8, latency: 3000 },
  { name: "technical_review", provider: SYSTEM, priority: 90, cost: 15, latency: 5000 },
  { name: "architecture", provider: SYSTEM, priority: 85, cost: 20, latency: 4000 },
  { name: "code_review", provider: SYSTEM, priority: 80, cost: 10, latency: 3000 },
  { name: "financial_analysis", provider: SYSTEM, priority: 80, cost: 12, latency: 2000 },
  { name: "budget_review", provider: SYSTEM, priority: 75, cost: 8, latency: 1500 },
  { name: "market_analysis", provider: SYSTEM, priority: 70, cost: 10, latency: 2500 },
  { name: "customer_insight", provider: SYSTEM, priority: 70, cost: 6, latency: 1000 },
  { name: "system_review", provider: SYSTEM, priority: 60, cost: 15, latency: 3000 },
  { name: "ai_audit", provider: SYSTEM, priority: 60, cost: 20, latency: 5000 },
  { name: "knowledge_curation", provider: SYSTEM, priority: 50, cost: 5, latency: 1000 },
  { name: "documentation", provider: SYSTEM, priority: 50, cost: 3, latency: 500 },
  { name: "operations", provider: SYSTEM, priority: 95, cost: 10, latency: 2000 },
  { name: "execution", provider: SYSTEM, priority: 95, cost: 8, latency: 1000 },
  { name: "monitoring", provider: SYSTEM, priority: 85, cost: 5, latency: 500 },
  { name: "mission_planning", provider: SYSTEM, priority: 100, cost: 15, latency: 3000 },
  { name: "proposal_review", provider: SYSTEM, priority: 80, cost: 10, latency: 2000 },
  { name: "organization_management", provider: SYSTEM, priority: 90, cost: 12, latency: 2500 },
  { name: "business_analysis", provider: SYSTEM, priority: 85, cost: 10, latency: 2000 },
  { name: "strategic_decision", provider: SYSTEM, priority: 100, cost: 20, latency: 5000 },
  { name: "report_aggregation", provider: SYSTEM, priority: 70, cost: 5, latency: 1000 },
  { name: "pipeline_execution", provider: SYSTEM, priority: 100, cost: 5, latency: 100 },
  { name: "event_dispatch", provider: SYSTEM, priority: 100, cost: 2, latency: 50 },
];

for (const cap of capabilities) {
  CapabilityRegistry.register({
    id: capId(cap.name),
    name: cap.name,
    provider: cap.provider,
    priority: cap.priority,
    cost: cap.cost,
    latency: cap.latency,
  });
}
