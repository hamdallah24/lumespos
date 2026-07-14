import type { ExecutionPlan } from "../../execution-planner/core/types";

export function formatProgressMessage(plan: ExecutionPlan): string {
  const total = plan.graph.nodes.length;
  const completed = plan.graph.nodes.filter(n => n.status === "completed").length;
  const failed = plan.graph.nodes.filter(n => n.status === "failed").length;
  const percent = Math.round((completed / total) * 100);

  let msg = `*Progress: ${plan.graph.name}*\n`;
  msg += `Progress: ${percent}% complete\n`;
  msg += `Tasks: ${completed}/${total} done`;
  if (failed > 0) msg += `, ${failed} failed`;
  msg += `\n\n`;

  if (plan.criticalPath.length > 0) {
    msg += `*Critical Path:* ${plan.criticalPathDuration} min\n`;
  }

  return msg;
}
