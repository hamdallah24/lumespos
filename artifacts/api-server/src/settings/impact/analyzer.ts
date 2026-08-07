// ConfigCenter — Milestone 6 Phase 2: Impact Analyzer.
// The Simulation Extension. It consumes the locked Pipeline's read-only plan()
// output (before/after/preview + baseline simulation + impact) and produces an
// enriched ImpactReport by asking registered providers for each changed key.
// Pure consumer: this module never calls pipeline.run() and never commits.

import type { ConfigurationRegistry } from "../registry";
import type { ConfigurationPipeline } from "../pipeline";
import type { WriteActor } from "../security";
import type { ConfigScope } from "../types";
import type { ImpactAnalyzeInput, ImpactChange, ImpactProviderDefinition, ImpactReport } from "./types";
import { ImpactProviderRegistry } from "./providers";

export interface ImpactAnalyzerDeps {
  registry: ConfigurationRegistry;
  pipeline: ConfigurationPipeline;
  providers?: ImpactProviderRegistry;
}

export class ImpactAnalyzer {
  private readonly registry: ConfigurationRegistry;
  private readonly pipeline: ConfigurationPipeline;
  private readonly providers: ImpactProviderRegistry;

  constructor(deps: ImpactAnalyzerDeps) {
    this.registry = deps.registry;
    this.pipeline = deps.pipeline;
    this.providers = deps.providers ?? ImpactProviderRegistry.get();
  }

  listProviders(): ImpactProviderDefinition[] {
    return this.providers.list();
  }

  /** Analyze a proposed change using the pipeline's read-only plan() plus
   *  registered providers. Never commits. */
  async analyze(params: { actor: WriteActor; scope: ConfigScope; changes: Record<string, unknown> }): Promise<ImpactReport> {
    const plan = await this.pipeline.plan({ actor: params.actor, scope: params.scope, changes: params.changes as Record<string, unknown> });
    return this.analyzePlan({
      correlationId: plan.correlationId,
      revision: plan.revision,
      scopeType: plan.scope.type,
      changes: plan.changes,
      before: plan.preview?.before ?? {},
      after: plan.preview?.after ?? {},
      baseline: plan.simulation,
      impact: plan.impact,
    });
  }

  /** Pure function over a plan slice — the Simulation Extension contract. */
  analyzePlan(input: ImpactAnalyzeInput): ImpactReport {
    const estimates = [];
    const impacted = new Set<string>(input.impact ?? []);
    const participating = new Set<string>();

    for (const [key, after] of Object.entries(input.changes)) {
      const meta = this.registry.get(key);
      if (!meta) continue;
      const change: ImpactChange = {
        key,
        before: input.before[key],
        after,
        meta,
        scopeType: input.scopeType,
      };
      const matches = this.providers.eligible(change);
      let providerUsed = false;
      for (const match of matches) {
        const est = match.provider.estimate(change);
        if (!est) continue;
        estimates.push(est);
        participating.add(match.provider.id);
        providerUsed = true;
        for (const s of est.subsystems) impacted.add(s);
      }
      if (!providerUsed && matches.length > 0) {
        // provider matched but declined — keep metadata estimate as baseline only
      }
    }

    return {
      run: { correlationId: input.correlationId, revision: input.revision, scopeType: input.scopeType },
      estimates,
      baseline: input.baseline ?? [],
      impacted: [...impacted],
      participatingProviders: [...participating],
    };
  }
}
