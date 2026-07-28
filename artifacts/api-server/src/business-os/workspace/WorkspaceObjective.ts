import type { Objective } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `obj-${Date.now()}-${counter}`;
}

export function createObjective(
  executive: string,
  title: string,
  description: string,
  priority: Objective["priority"] = "normal",
  targetValue?: number,
  unit?: string,
): Objective {
  return {
    id: nextId(),
    executive,
    title,
    description,
    status: "active",
    priority,
    targetValue,
    currentValue: 0,
    unit,
    createdAt: new Date().toISOString(),
  };
}

export function completeObjective(objective: Objective): Objective {
  return { ...objective, status: "completed", completedAt: new Date().toISOString(), currentValue: objective.targetValue ?? objective.currentValue };
}

export function cancelObjective(objective: Objective): Objective {
  return { ...objective, status: "cancelled", completedAt: new Date().toISOString() };
}

export function updateObjectiveProgress(objective: Objective, currentValue: number): Objective {
  return { ...objective, currentValue };
}

export const DEFAULT_OBJECTIVES: Record<string, Objective[]> = {
  COO: [
    createObjective("COO", "Maintain stock accuracy above 95%", "Ensure inventory records match physical stock", "high", 95, "%"),
    createObjective("COO", "Reduce operational waste by 15%", "Minimize loss, spoilage, and inefficiency", "high", 85, "%"),
    createObjective("COO", "Improve warehouse utilization", "Optimize storage and warehouse space usage", "normal", 80, "%"),
    createObjective("COO", "Ensure production efficiency", "Streamline production process and reduce downtime", "high", 90, "%"),
    createObjective("COO", "Optimize supply chain", "Reduce supplier lead time and improve PO accuracy", "normal"),
  ],
  CFO: [
    createObjective("CFO", "Maintain healthy cash flow", "Cash position always above minimum threshold", "critical"),
    createObjective("CFO", "Improve gross profit margin", "Increase margin through cost optimization", "high", 40, "%"),
    createObjective("CFO", "Reduce expense ratio", "Keep operational expenses under control", "high"),
    createObjective("CFO", "Ensure accurate financial reporting", "All journal entries reconciled before period close", "critical"),
  ],
  CMO: [
    createObjective("CMO", "Increase sales revenue 20%", "Drive top-line growth through marketing campaigns", "high", 20, "%"),
    createObjective("CMO", "Improve campaign ROI", "Optimize marketing spend for maximum return", "high", 3, "x"),
    createObjective("CMO", "Increase customer reach", "Expand brand awareness and customer base", "normal"),
  ],
  CHRO: [
    createObjective("CHRO", "Maintain attendance rate above 90%", "Ensure consistent staffing across all branches", "high", 90, "%"),
    createObjective("CHRO", "Improve employee retention", "Reduce turnover rate", "high"),
    createObjective("CHRO", "Fill open positions within 30 days", "Streamline recruitment process", "normal", 30, "days"),
  ],
  CEO: [
    createObjective("CEO", "Company health score above 80", "Overall business health across all dimensions", "high", 80, "%"),
    createObjective("CEO", "Achieve strategic growth targets", "Revenue and expansion goals aligned with vision", "critical"),
    createObjective("CEO", "Maintain governance compliance", "All executive decisions follow governance framework", "critical"),
  ],
  CAIO: [
    createObjective("CAIO", "Improve system intelligence score", "Increase AI accuracy and reasoning quality", "high", 90, "%"),
    createObjective("CAIO", "Expand automation coverage", "Automate repetitive operational decisions", "normal"),
    createObjective("CAIO", "Maintain knowledge quality", "Ensure Knowledge Platform has accurate, up-to-date information", "high"),
  ],
  CKO: [
    createObjective("CKO", "Grow organizational knowledge base", "Document best practices and lessons learned", "normal"),
    createObjective("CKO", "Improve knowledge retrieval accuracy", "Ensure executives find relevant knowledge quickly", "high", 90, "%"),
  ],
  CTO: [
    createObjective("CTO", "Maintain system uptime above 99%", "Ensure all systems are operational", "critical", 99, "%"),
    createObjective("CTO", "Reduce deployment cycle time", "Ship features faster with quality", "normal"),
  ],
};
