import type { OperationalSituation, ApprovalLevel } from "../../operational-decision-engine/core/types";
import type { ExecutionPlan } from "../../execution-planner/core/types";

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requiredLevel: ApprovalLevel;
  impact: string;
  options: { id: string; label: string; description: string }[];
  createdAt: string;
}

let approvalCounter = 0;
function nextId(): string {
  approvalCounter++;
  return `APPR-${Date.now().toString(36)}-${approvalCounter}`;
}

export const ApprovalFormatter = {
  fromSituation(situation: OperationalSituation): ApprovalRequest {
    return {
      id: nextId(),
      title: `Approval: ${situation.title}`,
      description: situation.description,
      requestedBy: "EIOS",
      requiredLevel: situation.severity === "critical" ? "ceo" : situation.severity === "high" ? "coo" : "manager",
      impact: situation.financialImpact
        ? `Estimated loss: ${situation.financialImpact.estimatedLoss} ${situation.financialImpact.currency}`
        : "Operational impact",
      options: [
        { id: "approve", label: "Setujui", description: "Proceed with recommended action" },
        { id: "reject", label: "Tolak", description: "Reject and escalate if needed" },
        { id: "escalate", label: "Eskalasi", description: "Forward to higher authority" },
      ],
      createdAt: new Date().toISOString(),
    };
  },

  fromPlan(plan: ExecutionPlan): ApprovalRequest {
    const approvalNodes = plan.graph.nodes.filter(n => n.type === "approval");
    return {
      id: nextId(),
      title: `Approval: ${plan.graph.name}`,
      description: `${plan.graph.nodes.length} tasks, ${approvalNodes.length} require approval`,
      requestedBy: "Execution Planner",
      requiredLevel: plan.graph.metadata?.direction === "major" ? "ceo" : "coo",
      impact: `Critical path duration: ${plan.criticalPathDuration} min`,
      options: [
        { id: "approve", label: "Setujui", description: "Approve execution plan" },
        { id: "modify", label: "Modifikasi", description: "Request changes before approval" },
        { id: "reject", label: "Tolak", description: "Reject the plan" },
      ],
      createdAt: new Date().toISOString(),
    };
  },
};
