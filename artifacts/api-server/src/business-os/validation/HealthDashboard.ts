import { getBusinessOS } from "../bootstrap/BusinessOS";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { isSchedulerRunning } from "../council";
import { getAllCapabilities } from "../capabilities";
import { getRICAdapter } from "../../runtime-intelligence-core/RICAdapter";
import type { HealthSummary } from "./types";
import { RuntimeProfiler } from "./RuntimeProfiler";
import type { BusinessScenario, ScenarioResult } from "./types";

export class HealthDashboard {
  private profiler = new RuntimeProfiler();

  checkHealth(): HealthSummary {
    const subsystems: HealthSummary["subsystems"] = [];

    this.profiler.start("Gateway");
    try {
      const gw = getRuntimeGateway();
      subsystems.push({ name: "Gateway", status: gw.isReady() ? "healthy" : "degraded", detail: gw.isReady() ? "RuntimeGateway ready" : "RuntimeGateway not ready" });
    } catch { subsystems.push({ name: "Gateway", status: "down", detail: "RuntimeGateway unavailable" }); }
    this.profiler.end("Gateway");

    this.profiler.start("RIC");
    try {
      const ric = getRICAdapter();
      subsystems.push({ name: "RIC", status: ric.isEnabled() ? "healthy" : "degraded", detail: ric.isEnabled() ? "RIC enabled" : "RIC not enabled" });
    } catch { subsystems.push({ name: "RIC", status: "down", detail: "RIC unavailable" }); }
    this.profiler.end("RIC");

    this.profiler.start("Capability");
    try {
      const caps = getAllCapabilities();
      subsystems.push({ name: "Capability", status: caps.length > 0 ? "healthy" : "degraded", detail: `${caps.length} capabilities loaded` });
    } catch { subsystems.push({ name: "Capability", status: "down", detail: "Capability layer unavailable" }); }
    this.profiler.end("Capability");

    this.profiler.start("Events");
    try {
      const active = ExecutiveEventBridge.isActive();
      subsystems.push({ name: "Events", status: active ? "healthy" : "degraded", detail: active ? "Event bridge active" : "Event bridge not active" });
    } catch { subsystems.push({ name: "Events", status: "down", detail: "Event system unavailable" }); }
    this.profiler.end("Events");

    this.profiler.start("Workspace");
    try {
      const wsi = WorkspaceIntegration.isActive();
      const count = ExecutiveWorkspaceManager.getExecutives().length;
      subsystems.push({ name: "Workspace", status: wsi ? "healthy" : "degraded", detail: wsi ? `${count} active workspaces` : "Workspace not active" });
    } catch { subsystems.push({ name: "Workspace", status: "down", detail: "Workspace system unavailable" }); }
    this.profiler.end("Workspace");

    this.profiler.start("Council");
    try {
      const running = isSchedulerRunning();
      subsystems.push({ name: "Council", status: running ? "healthy" : "degraded", detail: running ? "Scheduler running" : "Scheduler not running" });
    } catch { subsystems.push({ name: "Council", status: "down", detail: "Council system unavailable" }); }
    this.profiler.end("Council");

    this.profiler.start("Execution");
    try {
      const ee = getExecutionEngine();
      subsystems.push({ name: "Execution", status: ee ? "healthy" : "degraded", detail: ee ? "Execution engine ready" : "Execution engine unavailable" });
    } catch { subsystems.push({ name: "Execution", status: "down", detail: "Execution engine unavailable" }); }
    this.profiler.end("Execution");

    this.profiler.start("Memory");
    try {
      const bos = getBusinessOS();
      subsystems.push({ name: "Memory", status: bos.isReady() ? "healthy" : "degraded", detail: bos.isReady() ? "Memory available" : "Memory status unknown" });
    } catch { subsystems.push({ name: "Memory", status: "down", detail: "Memory system unavailable" }); }
    this.profiler.end("Memory");

    this.profiler.start("Knowledge");
    try {
      const bos = getBusinessOS();
      subsystems.push({ name: "Knowledge", status: bos.isReady() ? "healthy" : "degraded", detail: bos.isReady() ? "Knowledge available" : "Knowledge status unknown" });
    } catch { subsystems.push({ name: "Knowledge", status: "down", detail: "Knowledge system unavailable" }); }
    this.profiler.end("Knowledge");

    const healthy = subsystems.filter(s => s.status === "healthy").length;
    const total = subsystems.length;
    const overall = total > 0 ? Math.round((healthy / total) * 100) : 0;

    return {
      overall,
      subsystems,
      scenarioPassRate: 0,
      totalScenarios: 0,
      passedScenarios: 0,
      avgLatencyMs: Math.round(this.profiler.getAverageMs()),
      timestamp: new Date().toISOString(),
    };
  }

  formatDashboard(health: HealthSummary, scenarioResults?: ScenarioResult[]): string {
    const lines: string[] = [];
    const h = overallHealthIcon(health.overall);
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│                 BUSINESS OS HEALTH DASHBOARD               │");
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push(`│  Health: ${h}  ${String(health.overall).padStart(2)}%                                          │`);
    lines.push("├─────────────────────────────────────────────────────────────┤");
    lines.push("│  Subsystems                                                │");
    lines.push("├─────────────────────────────────────────────────────────────┤");
    for (const sub of health.subsystems) {
      const icon = sub.status === "healthy" ? "✓" : sub.status === "degraded" ? "~" : "✗";
      lines.push(`│  ${icon} ${sub.name.padEnd(15)} ${sub.detail.padEnd(45)} │`);
    }
    lines.push("├─────────────────────────────────────────────────────────────┤");
    if (scenarioResults && scenarioResults.length > 0) {
      const passed = scenarioResults.filter(r => r.passed).length;
      const rate = Math.round((passed / scenarioResults.length) * 100);
      lines.push(`│  Scenarios: ${String(passed)}/${String(scenarioResults.length)} (${rate}%)                               │`);
    }
    lines.push(`│  Avg Latency: ${String(health.avgLatencyMs).padStart(5)} ms                                     │`);
    lines.push(`│  Updated: ${health.timestamp.slice(0, 19).replace("T", " ")}                          │`);
    lines.push("└─────────────────────────────────────────────────────────────┘");
    return lines.join("\n");
  }

  getProfileTable(): string {
    return this.profiler.getTable();
  }
}

function overallHealthIcon(pct: number): string {
  if (pct >= 90) return "🟢";
  if (pct >= 60) return "🟡";
  return "🔴";
}
