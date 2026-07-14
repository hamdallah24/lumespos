import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { StrategicObjective } from "../../strategy-engine/core/types";
import type { ExecutionPlan } from "../../execution-planner/core/types";

export const ActionItemExtractor = {
  extract(
    situations: OperationalSituation[],
    objectives: StrategicObjective[],
    plans: ExecutionPlan[],
  ): string[] {
    const items: string[] = [];

    for (const s of situations) {
      if (s.severity === "critical" || s.severity === "high") {
        items.push(`[URGENT] ${s.title} — review and decide`);
      }
    }

    for (const obj of objectives) {
      for (const kpi of obj.kpiTargets) {
        if (kpi.currentValue < kpi.targetValue) {
          items.push(`[TARGET] ${kpi.metric}: ${kpi.currentValue} → ${kpi.targetValue} ${kpi.unit} (gap: ${kpi.targetValue - kpi.currentValue})`);
        }
      }
    }

    for (const plan of plans) {
      const failed = plan.graph.nodes.filter(n => n.status === "failed");
      for (const f of failed) {
        items.push(`[FAILED] ${f.label} in plan ${plan.graph.name} — rollback may be needed`);
      }
    }

    return items;
  },
};
