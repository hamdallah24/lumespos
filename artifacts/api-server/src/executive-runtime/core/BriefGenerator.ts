import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { StrategicObjective } from "../../strategy-engine/core/types";
import type { ExecutionPlan } from "../../execution-planner/core/types";
import type { KnowledgeBlock } from "../../knowledge-platform/core/types";
import { SectionPrioritizer } from "./SectionPrioritizer";
import { ActionItemExtractor } from "./ActionItemExtractor";

export interface BriefSection {
  title: string;
  priority: number;
  content: string;
  items: string[];
}

export interface ExecutiveBrief {
  id: string;
  role: string;
  title: string;
  date: string;
  summary: string;
  sections: BriefSection[];
  actionItems: string[];
  pendingApprovals: string[];
  branchId?: number;
  branchName?: string;
}

let briefCounter = 0;
function nextId(): string {
  briefCounter++;
  return `BRIEF-${Date.now().toString(36)}-${briefCounter}`;
}

export const BriefGenerator = {
  generate(params: {
    role: string;
    situations: OperationalSituation[];
    objectives: StrategicObjective[];
    plans: ExecutionPlan[];
    knowledge: KnowledgeBlock[];
    branchId?: number;
    branchName?: string;
  }): ExecutiveBrief {
    const { role, situations, objectives, plans, knowledge, branchId, branchName } = params;

    const sections: BriefSection[] = [];

    if (branchName && branchId) {
      sections.push({
        title: "Cabang Aktif",
        priority: 99,
        content: `Cabang: ${branchName} (ID:${branchId})`,
        items: [`Bekerja di ${branchName} (ID:${branchId})`],
      });
    }

    const situationSection = SectionPrioritizer.situationSummary(situations);
    if (situationSection) sections.push(situationSection);

    const planSection = SectionPrioritizer.planSummary(plans);
    if (planSection) sections.push(planSection);

    const objectiveSection = SectionPrioritizer.objectiveSummary(objectives);
    if (objectiveSection) sections.push(objectiveSection);

    const knowledgeSection = SectionPrioritizer.knowledgeSummary(knowledge);
    if (knowledgeSection) sections.push(knowledgeSection);

    const actionItems = ActionItemExtractor.extract(situations, objectives, plans);
    const pendingApprovals = situations
      .filter(s => s.severity === "high" || s.severity === "critical")
      .map(s => `${s.title} (${s.id})`);

    const criticalCount = situations.filter(s => s.severity === "critical").length;
    const highCount = situations.filter(s => s.severity === "high").length;

    const summary = `${criticalCount} critical, ${highCount} high severity situations — ${actionItems.length} action items pending`;

    return {
      id: nextId(),
      role,
      title: `Executive Brief — ${role}${branchName ? ` (${branchName})` : ""}`,
      date: new Date().toISOString(),
      summary,
      sections,
      actionItems,
      pendingApprovals,
      branchId,
      branchName,
    };
  },
};
