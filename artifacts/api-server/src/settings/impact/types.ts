// ConfigCenter — Milestone 6 Phase 2: Impact Provider SDK types.
// The Impact Contract. Providers extend the pipeline's metadata-driven
// SIMULATION/IMPACT stages with subsystem-aware estimates. They are consumers:
// given a change (key, before, after, metadata), they return an assessment.
// This SDK never modifies the locked Pipeline.

import type { ConfigFieldMeta } from "../types";
import type { SimulationResult } from "../pipeline";

/** The unit of impact analysis passed to a provider for a single changed key. */
export interface ImpactChange {
  key: string;
  before: unknown;
  after: unknown;
  meta: ConfigFieldMeta;
  scopeType: string;
}

export type ImpactSeverity = "none" | "low" | "medium" | "high" | "critical";

export interface ImpactEstimate {
  key: string;
  provider: string;
  severity: ImpactSeverity;
  summary: string;
  detail: string;
  /** Subsystems (owner/system ids) this change affects. */
  subsystems: string[];
}

export interface ImpactProviderDefinition {
  id: string;
  name: string;
  version: string;
  /** Declare which metadata categories / restart strategies this provider
   *  understands. Empty array = any. */
  categories?: string[];
  keys?: string[];
  /** Capabilities the provider contributes to the ecosystem (Capability Discovery). */
  capabilities?: string[];
  /** Estimate impact for a single changed key. Return null to defer. */
  estimate(change: ImpactChange): ImpactEstimate | null;
}

export interface ImpactReport {
  run: {
    correlationId: string;
    revision?: number;
    scopeType: string;
  };
  /** Simulate (baseline) plus provider-enriched estimates. */
  estimates: ImpactEstimate[];
  /** Baseline simulation slice from the pipeline (kept for continuity). */
  baseline: SimulationResult[];
  /** Expanded impacted subsystems incl. provider-declared ones. */
  impacted: string[];
  /** Providers that contributed at least one estimate. */
  participatingProviders: string[];
}

export interface ImpactAnalyzeInput {
  correlationId: string;
  revision?: number;
  scopeType: string;
  changes: Record<string, unknown>;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  baseline?: SimulationResult[];
  impact?: string[];
}