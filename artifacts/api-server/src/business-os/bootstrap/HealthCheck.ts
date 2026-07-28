import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getRICAdapter } from "../../runtime-intelligence-core/RICAdapter";
import { getAllCapabilities } from "../capabilities/CapabilityRegistry";
import * as CouncilScheduler from "../council/CouncilScheduler";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface SubsystemHealth {
  status: "ok" | "degraded" | "down";
  detail: string;
  latencyMs?: number;
}

export interface HealthReport {
  overall: boolean;
  subsystems: Record<string, SubsystemHealth>;
  overallPercent: number;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthReport> {
  const subsystems: Record<string, SubsystemHealth> = {};
  const t0 = Date.now();

  // Runtime
  try {
    const gateway = getRuntimeGateway();
    subsystems["Runtime"] = {
      status: gateway.isReady() ? "ok" : "degraded",
      detail: gateway.isReady() ? "RuntimeGateway ready" : "RuntimeGateway initialized but not fully ready",
    };
  } catch (e: any) {
    subsystems["Runtime"] = { status: "down", detail: e.message };
  }

  // RIC
  try {
    const adapter = getRICAdapter();
    subsystems["RIC"] = {
      status: adapter.isEnabled() ? "ok" : "down",
      detail: adapter.isEnabled() ? "RIC enabled" : "RIC not enabled",
    };
  } catch (e: any) {
    subsystems["RIC"] = { status: "down", detail: e.message };
  }

  // Capability
  try {
    const count = getAllCapabilities().length;
    subsystems["Capability"] = {
      status: count > 0 ? "ok" : "degraded",
      detail: `${count} capabilities registered`,
    };
  } catch (e: any) {
    subsystems["Capability"] = { status: "down", detail: e.message };
  }

  // Events
  try {
    const active = ExecutiveEventBridge.isActive();
    subsystems["Events"] = {
      status: active ? "ok" : "down",
      detail: active ? "EventBridge subscribed to EventBus" : "EventBridge not active",
    };
  } catch (e: any) {
    subsystems["Events"] = { status: "down", detail: e.message };
  }

  // Workspace
  try {
    const active = WorkspaceIntegration.isActive();
    const execCount = ExecutiveWorkspaceManager.getExecutives().length;
    subsystems["Workspace"] = {
      status: active ? "ok" : "down",
      detail: active ? `Workspace active, ${execCount} executives` : "Workspace integration not active",
    };
  } catch (e: any) {
    subsystems["Workspace"] = { status: "down", detail: e.message };
  }

  // Council
  try {
    const running = CouncilScheduler.isSchedulerRunning();
    subsystems["Council"] = {
      status: running ? "ok" : "down",
      detail: running ? "Council scheduler running" : "Council scheduler not started",
    };
  } catch (e: any) {
    subsystems["Council"] = { status: "down", detail: e.message };
  }

  // Execution
  try {
    const { getExecutionEngine } = await import("../../executive-runtime/execution/ExecutionEngine");
    const engine = getExecutionEngine();
    subsystems["Execution"] = {
      status: "ok",
      detail: `Execution engine ready (${engine.getRegistry()?.size?.() || 0} handlers)`,
    };
  } catch (e: any) {
    subsystems["Execution"] = { status: "down", detail: e.message };
  }

  // Memory
  try {
    const { memoryProvider } = await import("../../executive-runtime/memory-provider");
    subsystems["Memory"] = {
      status: memoryProvider ? "ok" : "degraded",
      detail: memoryProvider ? "Memory provider available" : "Memory provider not available",
    };
  } catch {
    subsystems["Memory"] = { status: "degraded", detail: "Memory provider not initialized" };
  }

  // Knowledge
  try {
    const { KnowledgeProvider } = await import("../../knowledge-platform/providers");
    const hasKnowledge = typeof KnowledgeProvider.getStats === "function";
    subsystems["Knowledge"] = {
      status: hasKnowledge ? "ok" : "degraded",
      detail: hasKnowledge ? "Knowledge platform available" : "Knowledge platform limited",
    };
  } catch {
    subsystems["Knowledge"] = { status: "degraded", detail: "Knowledge platform not initialized" };
  }

  const statuses = Object.values(subsystems).map(s => s.status);
  const ok = statuses.filter(s => s === "ok").length;
  const overallPercent = Math.round((ok / statuses.length) * 100);

  return {
    overall: statuses.every(s => s !== "down"),
    subsystems,
    overallPercent,
    timestamp: new Date().toISOString(),
  };
}

export function formatHealthReport(report: HealthReport): string {
  const lines = ["Business OS Health", "================================"];
  for (const [name, health] of Object.entries(report.subsystems)) {
    const icon = health.status === "ok" ? "✓" : health.status === "degraded" ? "~" : "✗";
    lines.push(`${icon} ${name.padEnd(14)} ${health.status.toUpperCase().padEnd(8)} ${health.detail}`);
  }
  lines.push("================================");
  lines.push(`Overall Ready   ${report.overallPercent}%`);
  lines.push(report.overall ? "STATUS: ALL SYSTEMS OPERATIONAL" : "STATUS: SOME SYSTEMS DOWN");
  return lines.join("\n");
}
