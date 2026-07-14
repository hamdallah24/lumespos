import type { PipelineContext } from "../contracts/PipelineContracts";
import { PipelineProfileRegistry } from "../internal/runtime-metadata/PipelineProfileRegistry";

export interface PipelineSelectionStrategy {
  name: string;
  select(intent: string, context: PipelineContext): string;
  explain?(intent: string): string;
}

export const RuleBasedStrategy: PipelineSelectionStrategy = {
  name: "rule-based",
  select(intent: string, _ctx: PipelineContext): string {
    const profile = PipelineProfileRegistry.getByIntent(intent);
    if (profile) return profile.id.name;

    const intents: Record<string, string> = {
      business_operation: "business",
      inventory_change: "business",
      sales_event: "business",
      founder_query: "query",
      planning_request: "planning",
      executive_command: "executive",
      data_analysis: "analytics",
      what_if: "simulation",
    };
    return intents[intent] || "business";
  },
};

let strategy: PipelineSelectionStrategy = RuleBasedStrategy;

export const PipelineResolver = {
  setStrategy(s: PipelineSelectionStrategy): void {
    strategy = s;
  },

  resolve(intent: string, ctx: PipelineContext): string {
    return strategy.select(intent, ctx);
  },

  getStrategy(): PipelineSelectionStrategy {
    return strategy;
  },
};
