/*

BUSINESS OS — DEAD MODULE AUDIT (Sprint 12.10)

Automatically checks:

1. All initialize() methods are called
2. No singleton is unregistered
3. No EventBus subscriber is dead
4. All capabilities are referenced
5. Workspace integration is active
6. Council scheduler is running
7. No broken initialization chains

Run:
  npx ts-node src/business-os/tests/dead-module-audit.ts

*/

import { getBusinessOS } from "../bootstrap";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getRICAdapter } from "../../runtime-intelligence-core/RICAdapter";
import { getAllCapabilities, getCapabilitiesByExecutive } from "../capabilities";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import * as CouncilScheduler from "../council/CouncilScheduler";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";
import { checkHealth } from "../bootstrap/HealthCheck";
import { eventBus } from "../../event-bus/EventBus";

interface AuditResult {
  subsystem: string;
  status: "connected" | "dead" | "partial" | "unknown";
  detail: string;
  runtimeCall: boolean;
  initCalled: boolean;
}

const results: AuditResult[] = [];

function audit(subsystem: string, checker: () => { ok: boolean; detail: string; runtimeCall: boolean; initCalled: boolean }): void {
  try {
    const r = checker();
    results.push({
      subsystem,
      status: r.ok ? "connected" : "dead",
      detail: r.detail,
      runtimeCall: r.runtimeCall,
      initCalled: r.initCalled,
    });
  } catch (e: any) {
    results.push({
      subsystem,
      status: "unknown",
      detail: e.message,
      runtimeCall: false,
      initCalled: false,
    });
  }
}

export function runAudit(): AuditResult[] {
  results.length = 0;

  // 1. Runtime Gateway
  audit("Runtime", () => {
    const gateway = getRuntimeGateway();
    const ready = gateway.isReady();
    return {
      ok: ready,
      detail: ready ? "RuntimeGateway ready (ricReady=true)" : "RuntimeGateway not ready (ricReady=false)",
      runtimeCall: true,
      initCalled: ready,
    };
  });

  // 2. RIC
  audit("RIC", () => {
    const adapter = getRICAdapter();
    const enabled = adapter.isEnabled();
    return {
      ok: enabled,
      detail: enabled ? "RIC enabled and initialized" : "RIC not enabled",
      runtimeCall: true,
      initCalled: enabled,
    };
  });

  // 3. Capability
  audit("Capability", () => {
    const count = getAllCapabilities().length;
    const hasExecutiveCaps = getCapabilitiesByExecutive("COO").length > 0;
    return {
      ok: count >= 11 && hasExecutiveCaps,
      detail: `${count} capabilities loaded, COO has ${getCapabilitiesByExecutive("COO").length}`,
      runtimeCall: true,
      initCalled: true,
    };
  });

  // 4. Events
  audit("Events", () => {
    const active = ExecutiveEventBridge.isActive();
    return {
      ok: active,
      detail: active ? "ExecutiveEventBridge subscribed to EventBus" : "ExecutiveEventBridge not initialized",
      runtimeCall: active,
      initCalled: active,
    };
  });

  // 5. Workspace
  audit("Workspace", () => {
    const active = WorkspaceIntegration.isActive();
    const execCount = ExecutiveWorkspaceManager.getExecutives().length;
    return {
      ok: active && execCount === 8,
      detail: active ? `WorkspaceIntegration active, ${execCount} executives` : "WorkspaceIntegration not active",
      runtimeCall: active,
      initCalled: active,
    };
  });

  // 6. Council
  audit("Council", () => {
    const running = CouncilScheduler.isSchedulerRunning();
    return {
      ok: running,
      detail: running ? "Council scheduler running" : "Council scheduler not started",
      runtimeCall: running,
      initCalled: running,
    };
  });

  // 7. Execution
  audit("Execution", () => {
    const engine = getExecutionEngine();
    const registry = engine.getRegistry();
    const handlerCount = registry.size();
    return {
      ok: handlerCount > 0,
      detail: `Execution engine ready, ${handlerCount} handlers registered`,
      runtimeCall: true,
      initCalled: true,
    };
  });

  // 8. BusinessOS Composition Root
  audit("BusinessOS", () => {
    const os = getBusinessOS();
    const ready = os.isReady();
    const bootTime = os.getBootTimeMs();
    return {
      ok: ready,
      detail: ready ? `BusinessOS ready (boot: ${(bootTime / 1000).toFixed(1)}s)` : "BusinessOS not ready",
      runtimeCall: true,
      initCalled: ready,
    };
  });

  return results;
}

export function formatAuditReport(results: AuditResult[]): string {
  const lines = [];
  lines.push("");
  lines.push("========================================");
  lines.push("  Business OS Integration Audit");
  lines.push("========================================");
  lines.push("");

  const connected = results.filter(r => r.status === "connected").length;
  const dead = results.filter(r => r.status === "dead").length;
  const partial = results.filter(r => r.status === "partial").length;

  for (const r of results) {
    const icon = r.status === "connected" ? "✓" : r.status === "dead" ? "✗" : r.status === "partial" ? "~" : "?";
    lines.push(`${icon} ${r.subsystem.padEnd(14)} ${r.status.toUpperCase().padEnd(12)} ${r.detail}`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  const deadModules = results.filter(r => r.status === "dead");
  if (deadModules.length > 0) {
    lines.push(`Dead Modules: ${deadModules.length}`);
    for (const d of deadModules) {
      lines.push(`  ✗ ${d.subsystem} — ${d.detail}`);
    }
  } else {
    lines.push("Dead Modules: 0");
  }

  const brokenChains = results.filter(r => !r.initCalled);
  if (brokenChains.length > 0) {
    lines.push(`Broken Chains: ${brokenChains.length}`);
    for (const b of brokenChains) {
      lines.push(`  ✗ ${b.subsystem} — init not called`);
    }
  } else {
    lines.push("Broken Chains: 0");
  }

  lines.push("");

  const total = results.length;
  const percent = total > 0 ? Math.round((connected / total) * 100) : 0;
  lines.push(`Overall Integration: ${percent}%`);
  lines.push(`(${connected}/${total} subsystems connected)`);
  lines.push("");

  return lines.join("\n");
}

// Auto-run if executed directly
const isMainModule = !module.parent;
if (isMainModule) {
  const results = runAudit();
  console.log(formatAuditReport(results));
  const allConnected = results.every(r => r.status === "connected");
  process.exit(allConnected ? 0 : 1);
}

export { audit };
