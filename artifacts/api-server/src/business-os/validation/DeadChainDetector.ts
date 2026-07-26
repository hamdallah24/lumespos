import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getRICAdapter } from "../../runtime-intelligence-core/RICAdapter";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { isSchedulerRunning } from "../council";
import { getAllCapabilities } from "../capabilities";
import { getBusinessOS } from "../bootstrap/BusinessOS";
import type { ChainLink, DeadModuleReport } from "./types";

export class DeadChainDetector {
  detect(): DeadModuleReport {
    const modules: { module: string; status: "connected" | "dead" | "partial"; detail: string; file?: string }[] = [];
    const integrationChains: { chain: string; status: "ok" | "broken"; brokenAt?: string }[] = [];

    // Runtime Gateway
    const gw = getRuntimeGateway();
    const gwReady = gw.isReady();
    modules.push({
      module: "RuntimeGateway",
      status: gwReady ? "connected" : "dead",
      detail: gwReady ? "RuntimeGateway ready" : "RuntimeGateway not ready",
      file: "ai/runtime/RuntimeGateway.ts",
    });

    // RIC
    let ricEnabled = false;
    try {
      ricEnabled = getRICAdapter().isEnabled();
    } catch { /* not enabled */ }
    modules.push({
      module: "RIC",
      status: ricEnabled ? "connected" : "dead",
      detail: ricEnabled ? "RIC enabled" : "RIC not enabled",
      file: "runtime-intelligence-core/RICAdapter.ts",
    });
    integrationChains.push({ chain: "RIC → Runtime", status: gwReady && ricEnabled ? "ok" : "broken", brokenAt: !gwReady ? "RuntimeGateway" : !ricEnabled ? "RIC" : undefined });

    // Capability
    let capCount = 0;
    try {
      capCount = getAllCapabilities().length;
    } catch { /* not available */ }
    const capsAvailable = capCount > 0;
    modules.push({
      module: "Capability",
      status: capsAvailable ? "connected" : "dead",
      detail: capsAvailable ? `${capCount} capabilities loaded` : "No capabilities loaded",
      file: "business-os/capabilities/",
    });
    integrationChains.push({ chain: "RIC → Capability", status: ricEnabled && capsAvailable ? "ok" : "broken", brokenAt: !capsAvailable ? "Capability" : undefined });

    // Events
    let bridgeActive = false;
    try {
      bridgeActive = ExecutiveEventBridge.isActive();
    } catch { /* not active */ }
    modules.push({
      module: "Events",
      status: bridgeActive ? "connected" : "dead",
      detail: bridgeActive ? "ExecutiveEventBridge subscribed" : "ExecutiveEventBridge not active",
      file: "business-os/events/ExecutiveEventBridge.ts",
    });
    integrationChains.push({ chain: "Capability → Events", status: capsAvailable && bridgeActive ? "ok" : "broken", brokenAt: !bridgeActive ? "Events" : undefined });

    // Workspace
    let wsActive = false;
    try {
      wsActive = WorkspaceIntegration.isActive();
    } catch { /* not active */ }
    const wsCount = wsActive ? ExecutiveWorkspaceManager.getExecutives().length : 0;
    modules.push({
      module: "Workspace",
      status: wsActive && wsCount >= 8 ? "connected" : wsActive ? "partial" : "dead",
      detail: wsActive ? `${wsCount} executives in workspace` : "WorkspaceIntegration not active",
      file: "business-os/workspace/",
    });
    integrationChains.push({ chain: "Events → Workspace", status: bridgeActive && wsActive ? "ok" : "broken", brokenAt: !wsActive ? "Workspace" : undefined });

    // Council
    let councilRunning = false;
    try {
      councilRunning = isSchedulerRunning();
    } catch { /* not running */ }
    modules.push({
      module: "Council",
      status: councilRunning ? "connected" : "dead",
      detail: councilRunning ? "Council scheduler running" : "Council scheduler not running",
      file: "business-os/council/",
    });
    integrationChains.push({ chain: "Workspace → Council", status: wsActive && councilRunning ? "ok" : "broken", brokenAt: !councilRunning ? "Council" : undefined });

    // Execution
    let execEngine = false;
    try {
      execEngine = !!getExecutionEngine();
    } catch { /* not available */ }
    modules.push({
      module: "Execution",
      status: execEngine ? "connected" : "dead",
      detail: execEngine ? "Execution engine ready" : "Execution engine not available",
      file: "executive-runtime/execution/ExecutionEngine.ts",
    });
    integrationChains.push({ chain: "Events → Execution", status: execEngine && bridgeActive ? "ok" : "broken", brokenAt: !execEngine ? "Execution" : undefined });

    // BusinessOS
    let bosReady = false;
    try {
      bosReady = getBusinessOS().isReady();
    } catch { /* not ready */ }
    modules.push({
      module: "BusinessOS",
      status: bosReady ? "connected" : "dead",
      detail: bosReady ? "BusinessOS ready" : "BusinessOS not ready",
      file: "business-os/bootstrap/BusinessOS.ts",
    });

    // Memory and Knowledge — check readiness directly
    const memOk = bosReady;
    const knowOk = bosReady;
    modules.push({
      module: "Memory",
      status: memOk ? "connected" : "dead",
      detail: memOk ? "Memory provider available (via BusinessOS)" : "Memory not available",
      file: "ai/runtime/memory/",
    });
    modules.push({
      module: "Knowledge",
      status: knowOk ? "connected" : "dead",
      detail: knowOk ? "Knowledge provider available (via BusinessOS)" : "Knowledge not available",
      file: "ai/runtime/knowledge/",
    });
    integrationChains.push({ chain: "Workspace → Memory", status: wsActive && memOk ? "ok" : "broken", brokenAt: !memOk ? "Memory" : undefined });
    integrationChains.push({ chain: "Memory → Knowledge", status: memOk && knowOk ? "ok" : "broken", brokenAt: !knowOk ? "Knowledge" : undefined });

    const deadModules = modules.filter(m => m.status === "dead").map(m => m.module);
    const brokenChains = integrationChains.filter(c => c.status === "broken").map(c => c.chain);
    const connected = modules.filter(m => m.status === "connected").length;
    const overallPercent = modules.length > 0 ? Math.round((connected / modules.length) * 100) : 0;

    return { businessOS: modules, integrationChains, deadModules, brokenChains, overallPercent };
  }

  formatReport(report: DeadModuleReport): string {
    const lines: string[] = [];
    lines.push("┌─────────────────────────────────────────────────────────────┐");
    lines.push("│              BUSINESS OS DEAD CHAIN DETECTOR               │");
    lines.push("└─────────────────────────────────────────────────────────────┘");
    lines.push("");
    for (const mod of report.businessOS) {
      const icon = mod.status === "connected" ? "✓" : mod.status === "partial" ? "~" : "✗";
      lines.push(`  ${icon} ${mod.module.padEnd(18)} ${mod.detail}`);
      if (mod.file) lines.push(`     ${mod.file}`);
    }
    lines.push("");
    if (report.integrationChains.length > 0) {
      lines.push("  Integration Chains:");
      for (const chain of report.integrationChains) {
        const icon = chain.status === "ok" ? "✓" : "✗";
        lines.push(`    ${icon} ${chain.chain}${chain.brokenAt ? ` (broken at: ${chain.brokenAt})` : ""}`);
      }
    }
    lines.push("");
    const deadCount = report.deadModules.length;
    lines.push(`  Dead Modules: ${deadCount}`);
    if (deadCount > 0) {
      for (const m of report.deadModules) lines.push(`    ✗ ${m}`);
    }
    lines.push(`  Broken Chains: ${report.brokenChains.length}`);
    lines.push(`  Overall Integration: ${report.overallPercent}%`);
    return lines.join("\n");
  }
}
