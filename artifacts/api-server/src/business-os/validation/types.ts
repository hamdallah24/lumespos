import type { CapabilityDomain } from "../capabilities/types";
import type { MeetingType } from "../council/types";

export type ScenarioDomain = CapabilityDomain | "council" | "cross-domain" | "ceo";

export interface ScenarioTrigger {
  type: "event" | "message" | "kpi_change" | "schedule";
  eventType?: string;
  data?: Record<string, unknown>;
  message?: string;
  userId?: number;
  executive?: string;
  kpiName?: string;
  newValue?: number;
  meetingType?: MeetingType;
  branchId?: number;
}

export interface AssertionStep {
  stage: string;
  check: () => boolean | Promise<boolean>;
  detail: string;
}

export interface ScenarioAssertion {
  stage: "ric_built" | "executive_selected" | "capability_selected" | "decision_generated" | "execution_success" | "event_published" | "workspace_updated" | "memory_updated" | "knowledge_updated";
  expected: boolean;
  critical: boolean;
}

export interface BusinessScenario {
  id: string;
  name: string;
  domain: ScenarioDomain;
  description: string;
  trigger: ScenarioTrigger;
  expectedExecutive: string;
  expectedCapabilities: string[];
  expectedActions: string[];
  expectedEvents: string[];
  priority: "low" | "normal" | "high" | "critical";
  tags: string[];
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  stages: ScenarioStageResult[];
  durationMs: number;
  error?: string;
}

export interface ScenarioStageResult {
  stage: string;
  passed: boolean;
  durationMs: number;
  detail: string;
  error?: string;
}

export interface ProfileEntry {
  stage: string;
  durationMs: number;
  timestamp: string;
}

export interface RuntimeProfile {
  scenarioId: string;
  stages: ProfileEntry[];
  totalMs: number;
}

export interface ChainLink {
  name: string;
  status: "ready" | "broken" | "missing" | "dead";
  detail: string;
  file?: string;
}

export interface HealthSummary {
  overall: number;
  subsystems: { name: string; status: "healthy" | "degraded" | "down"; detail: string }[];
  scenarioPassRate: number;
  totalScenarios: number;
  passedScenarios: number;
  avgLatencyMs: number;
  timestamp: string;
}

export interface DeadModuleReport {
  businessOS: { module: string; status: "connected" | "dead" | "partial"; detail: string; file?: string }[];
  integrationChains: { chain: string; status: "ok" | "broken"; brokenAt?: string }[];
  deadModules: string[];
  brokenChains: string[];
  overallPercent: number;
}
