import type { GovernanceReportEntry } from "./GovernanceReport";
import { EventRegistry } from "../runtime-metadata/EventRegistry";
import { ObserverRegistry } from "../runtime-metadata/ObserverRegistry";

export interface EventIntegrityResult {
  entry: GovernanceReportEntry;
}

export const EventIntegrityAuditor = {
  check(): EventIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const events = EventRegistry.getAll();
    const observers = ObserverRegistry.getAll();

    if (events.length === 0) {
      errors.push("No events registered — event system is non-functional");
      recommendations.push("Register events: pipeline.started, pipeline.completed, pipeline.error, stage.completed, stage.failed, decision.made, council.resolved, brief.generated");
    }

    const subscribedEvents = new Set(observers.map(o => o.subscribe));
    const registeredEventNames = new Set(events.map(e => e.id.name));

    for (const e of events) {
      if (e.producer.length === 0) {
        warnings.push(`Event "${e.id.name}" has no producer defined`);
      }
      if (e.consumer.length === 0) {
        warnings.push(`Event "${e.id.name}" has no consumer defined`);
      }
      if (!e.schema || Object.keys(e.schema).length === 0) {
        warnings.push(`Event "${e.id.name}" has empty schema`);
      }
    }

    for (const sub of subscribedEvents) {
      if (!registeredEventNames.has(sub) && !Array.from(registeredEventNames).some(n => sub.includes(n))) {
        warnings.push(`Observer subscribes to "${sub}" but no matching event is registered`);
        recommendations.push(`Register event "${sub}" or update observer subscription`);
      }
    }

    for (const e of events) {
      if (!subscribedEvents.has(e.id.name) && !Array.from(subscribedEvents).some(s => s.includes(e.id.name))) {
        warnings.push(`Event "${e.id.name}" is registered but has no subscribers`);
        recommendations.push(`Create observer for "${e.id.name}" or remove unused event`);
      }
    }

    return {
      entry: {
        passed: errors.length === 0,
        detail: `${events.length} events, ${subscribedEvents.size} unique subscriptions`,
        warnings,
        errors,
        recommendations,
      },
    };
  },
};
