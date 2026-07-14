import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { StrategicObjective } from "../../strategy-engine/core/types";
import type { ExecutionPlan } from "../../execution-planner/core/types";
import type { KnowledgeBlock } from "../../knowledge-platform/core/types";
import type { BriefSection } from "./BriefGenerator";

const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const SectionPrioritizer = {
  situationSummary(situations: OperationalSituation[]): BriefSection | null {
    if (situations.length === 0) return null;
    const sorted = [...situations].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));
    return {
      title: "Situations Requiring Attention",
      priority: 0,
      content: `${sorted.length} active situations`,
      items: sorted.map(s => `[${s.severity.toUpperCase()}] ${s.title} — ${s.description.slice(0, 100)}`),
    };
  },

  planSummary(plans: ExecutionPlan[]): BriefSection | null {
    if (plans.length === 0) return null;
    const active = plans.filter(p => p.graph.nodes.some(n => n.status === "in_progress" || n.status === "pending"));
    return {
      title: "Execution Plans",
      priority: 1,
      content: `${active.length} active plans`,
      items: active.map(p => `${p.graph.name} — ${p.graph.nodes.filter(n => n.status === "completed").length}/${p.graph.nodes.length} tasks done`),
    };
  },

  objectiveSummary(objectives: StrategicObjective[]): BriefSection | null {
    if (objectives.length === 0) return null;
    const active = objectives.filter(o => o.status === "active");
    return {
      title: "Strategic Objectives",
      priority: 2,
      content: `${active.length} active objectives`,
      items: active.map(o => `${o.title} — ${o.direction} (North Star alignment: ${o.northStarAlignment}%)`),
    };
  },

  knowledgeSummary(blocks: KnowledgeBlock[]): BriefSection | null {
    if (blocks.length === 0) return null;
    const recent = blocks.slice(0, 5);
    return {
      title: "Recent Knowledge",
      priority: 3,
      content: `${blocks.length} total knowledge blocks`,
      items: recent.map(b => `[${b.type}] ${b.summary.slice(0, 100)}`),
    };
  },
};
