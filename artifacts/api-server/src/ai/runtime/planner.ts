// SPRINT 11: Planner — ExecutionSpec → TaskGraph
// CTO doesn't think anymore. It executes tasks.
import type { ExecutionSpecificationV1 } from "./execution-spec";

export interface Task {
  id: string;
  step: number;
  description: string;          // What to do
  domain: string;               // Which domain
  requiredKnowledge: string[];  // What to read first
  requiredTool: string | null;  // Tool to use, or null = just think
  expectedOutput: string;       // What success looks like
  dependsOn: number[];          // Step IDs that must complete first
}

export interface TaskGraph {
  specId: string;
  totalSteps: number;
  tasks: Task[];
  estimatedTokens: number;
  executionOrder: number[];     // Topological sort
}

/** Build task graph from ExecutionSpec */
export function plan(spec: ExecutionSpecificationV1): TaskGraph {
  const tasks: Task[] = [];
  let step = 0;

  // Task 1: Always — load context
  tasks.push({
    id: `t${step}`, step,
    description: `Load ${spec.requiredKnowledge.join(", ") || "Foundation"} knowledge`,
    domain: spec.domain,
    requiredKnowledge: spec.requiredKnowledge,
    requiredTool: null,
    expectedOutput: "Context ready for analysis",
    dependsOn: [],
  });
  step++;

  // Task 2: Read relevant files (if entities exist)
  if (spec.entities.length > 0) {
    tasks.push({
      id: `t${step}`, step,
      description: `Read files related to: ${spec.entities.join(", ")}`,
      domain: spec.domain,
      requiredKnowledge: [],
      requiredTool: "readFile",
      expectedOutput: "File contents loaded",
      dependsOn: [0],
    });
    step++;
  }

  // Task 3: Search codebase (if implementation or analysis)
  if (spec.intent === "implement_change" || spec.intent === "analyze_code") {
    tasks.push({
      id: `t${step}`, step,
      description: `Search for patterns: ${spec.entities.join(", ")}`,
      domain: spec.domain,
      requiredKnowledge: [],
      requiredTool: "searchContent",
      expectedOutput: "Related code locations found",
      dependsOn: [0],
    });
    step++;
  }

  // Task 4: Analyze or propose
  const analysisDep = step > 1 ? [1, step - 1] : [0];
  tasks.push({
    id: `t${step}`, step,
    description: spec.intent === "implement_change"
      ? "Compare findings against expected, identify root cause"
      : spec.intent === "analyze_code"
        ? "Analyze code structure, find patterns and issues"
        : spec.intent === "devops_operation"
          ? "Check server status and logs"
          : `Understand: ${spec.problem}`,
    domain: spec.domain,
    requiredKnowledge: ["Foundation", "architecture"],
    requiredTool: null,
    expectedOutput: spec.intent === "implement_change" ? "Root cause identified" : "Analysis complete",
    dependsOn: analysisDep,
  });
  step++;

  // Task 5: Generate output
  tasks.push({
    id: `t${step}`, step,
    description: spec.intent === "implement_change"
      ? "Generate fix proposal with code changes"
      : spec.intent === "greeting"
        ? "Respond conversationally"
        : "Generate final analysis report",
    domain: spec.domain,
    requiredKnowledge: [],
    requiredTool: null,
    expectedOutput: "Final output ready",
    dependsOn: [step - 1],
  });

  // Topological sort
  const executionOrder = topologicalSort(tasks);

  return {
    specId: spec.id,
    totalSteps: tasks.length,
    tasks,
    estimatedTokens: spec.estimatedTokens,
    executionOrder,
  };
}

function topologicalSort(tasks: Task[]): number[] {
  const visited = new Set<number>();
  const order: number[] = [];

  function visit(step: number) {
    if (visited.has(step)) return;
    visited.add(step);
    const task = tasks.find(t => t.step === step);
    if (task) {
      for (const dep of task.dependsOn) visit(dep);
    }
    order.push(step);
  }

  for (const task of tasks) visit(task.step);
  return order;
}

export const planner = {
  name: "Planner",
  version: "1.0.0",
  capabilities: ["task-decomposition", "dependency-resolution", "execution-planning"],
  dependencies: ["ExecutionSpecificationV1"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
