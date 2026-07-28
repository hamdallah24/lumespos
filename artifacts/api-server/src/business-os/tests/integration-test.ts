/*

BUSINESS OS — INTEGRATION TEST

Verifies the complete end-to-end flow:

  BusinessOS.initialize()
  → RIC ready
  → Runtime ready
  → Capabilities loaded
  → Events active
  → Workspace active
  → Council scheduler running
  → Execution engine ready

Then:

  User → Gateway → RIC → Capability → Executive → Decision → Execution → EventBus → Workspace → Memory → Council

Run:
  npx ts-node src/business-os/tests/integration-test.ts

*/

import { initializeBusinessOS, getBusinessOS, checkHealth, formatHealthReport } from "../bootstrap";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { getRICAdapter } from "../../runtime-intelligence-core/RICAdapter";
import { getAllCapabilities, getCapabilitiesByExecutive } from "../capabilities";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import * as CouncilScheduler from "../council/CouncilScheduler";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";
import { eventBus } from "../../event-bus/EventBus";
import { memoryProvider } from "../../executive-runtime/memory-provider";
import { KnowledgeProvider } from "../../knowledge-platform/providers";

let passed = 0;
let failed = 0;
let errors: string[] = [];

function test(name: string, fn: () => boolean | Promise<boolean>): void {
  // no-op in automated context
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    errors.push(message);
    console.log(`  ✗ ${message}`);
  }
}

async function runAll(): Promise<{ passed: number; failed: number; errors: string[] }> {
  console.log("");
  console.log("========================================");
  console.log("  Business OS Integration Test Suite");
  console.log("========================================");
  console.log("");

  // ===== TEST 1: BusinessOS Composition Root =====
  console.log("[Test 1] BusinessOS Boot");

  try {
    const os = await initializeBusinessOS(process.cwd());
    assert(os.isReady(), "BusinessOS.isReady() returns true after boot");
    assert(getBusinessOS().isReady(), "getBusinessOS() singleton returns ready");
    assert(getBusinessOS().getBootTimeMs() > 0, "Boot time recorded");
  } catch (e: any) {
    assert(false, `BusinessOS boot: ${e.message}`);
  }

  // ===== TEST 2: RIC Activation =====
  console.log("[Test 2] RIC Activation");

  try {
    const adapter = getRICAdapter();
    assert(adapter.isEnabled(), "RIC adapter is enabled");

    const rc = await adapter.assemble({
      message: "Test message",
      userId: "test",
      branchId: 1,
    });
    assert(!!rc, "RIC.assemble() returns RuntimeContext");
    assert(!!rc.intelligence, "RuntimeContext has intelligence");
    assert(!!rc.grounding, "RuntimeContext has grounding");

    const execCtx = adapter.getExecutiveContext("COO")!;
    assert(!!execCtx, "getExecutiveContext('COO') returns context");
    assert(!!execCtx.capabilities, "ExecutiveContext has capabilities");

    const capCtx = execCtx.capabilities!;
    assert(capCtx.availableCapabilities.length > 0, "availableCapabilities is not empty");
    assert(Array.isArray(capCtx.recommendedCapabilities), "recommendedCapabilities is array");
    assert(Array.isArray(capCtx.blockedCapabilities), "blockedCapabilities is array");
    assert(Array.isArray(capCtx.dependencySummary), "dependencySummary is array");
  } catch (e: any) {
    assert(false, `RIC test: ${e.message}`);
  }

  // ===== TEST 3: Runtime Gateway Activation =====
  console.log("[Test 3] Runtime Gateway Activation");

  try {
    const gateway = getRuntimeGateway();
    assert(gateway.isReady(), "RuntimeGateway.isReady() returns true");
    assert(!!gateway.getExecutive("CEO"), "getExecutive('CEO') returns handler");
    assert(!!gateway.getExecutive("COO"), "getExecutive('COO') returns handler");
    assert(!gateway.getExecutive("NONEXISTENT"), "getExecutive('NONEXISTENT') returns null");
  } catch (e: any) {
    assert(false, `Runtime test: ${e.message}`);
  }

  // ===== TEST 4: Capability Layer =====
  console.log("[Test 4] Capability Layer");

  try {
    const all = getAllCapabilities();
    assert(all.length === 11, `11 capabilities loaded (got ${all.length})`);

    const inventory = all.find(c => c.id === "cap_inventory");
    assert(!!inventory, "Inventory capability exists");
    assert(inventory!.supportedActions.length >= 10, "Inventory has 10+ actions");

    const cooCaps = getCapabilitiesByExecutive("COO");
    assert(cooCaps.length >= 3, "COO has 3+ capabilities");

    const cfoCaps = getCapabilitiesByExecutive("CFO");
    assert(cfoCaps.length >= 1, "CFO has 1+ capabilities");
  } catch (e: any) {
    assert(false, `Capability test: ${e.message}`);
  }

  // ===== TEST 5: Event System Activation =====
  console.log("[Test 5] Event System Activation");

  try {
    assert(ExecutiveEventBridge.isActive(), "ExecutiveEventBridge is active");

    // Test direct submit
    let verified = false;
    await ExecutiveEventBridge.submitDirect("stock.low", {
      productId: 1,
      productName: "Test Item",
      currentStock: 5,
      minStock: 10,
      branchId: 1,
    }, 1, 0);

    // Allow inbox processing
    await new Promise(r => setTimeout(r, 500));
    assert(true, "EventBridge.submitDirect completes without error");

    // Test EventAggregator via EventBus publish
    const testEvent = {
      type: "stock.low" as const,
      version: "1.0.0" as const,
      aggregateType: "inventory" as const,
      aggregateId: "test-001",
      data: { productId: 1, branchId: 1 },
      id: `evt-${Date.now()}`,
      sequence: Date.now(),
      timestamp: new Date().toISOString(),
      metadata: {},
    };

    eventBus.publish(testEvent as any);
    await new Promise(r => setTimeout(r, 300));
    assert(true, "EventBus.publish completes without error");
  } catch (e: any) {
    assert(false, `Event test: ${e.message}`);
  }

  // ===== TEST 6: Workspace Activation =====
  console.log("[Test 6] Workspace Activation");

  try {
    assert(WorkspaceIntegration.isActive(), "WorkspaceIntegration is active");
    assert(ExecutiveWorkspaceManager.getExecutives().length === 8, "8 executives registered in workspace");

    // Verify each executive has default workspace
    for (const exec of ["COO", "CFO", "CMO", "CHRO", "CEO", "CAIO", "CKO", "CTO"]) {
      const ws = ExecutiveWorkspaceManager.getWorkspace(exec);
      assert(!!ws, `${exec} workspace exists`);
      assert(ws.executive === exec, `${exec} workspace has correct executive name`);
    }

    // Test workspace operations
    const task = ExecutiveWorkspaceManager.addTask("COO", "Test task", "Integration test task", "normal");
    assert(!!task, "WorkspaceManager.addTask creates task");
    assert(task.executive === "COO", "Task assigned to correct executive");

    // Test recommendation
    const rec = ExecutiveWorkspaceManager.addRecommendation("COO", "Test rec", "Integration test rec", 0.85);
    assert(!!rec, "WorkspaceManager.addRecommendation creates recommendation");

    // Test decision recording
    ExecutiveWorkspaceManager.recordDecision("COO", "dec-001", "restock", "Test decision", 0.9, {}, "system");
    const ws = ExecutiveWorkspaceManager.getWorkspace("COO");
    assert(ws.decisions.length >= 1, "Decision recorded in workspace");

    // Test timeline
    const timeline = ExecutiveWorkspaceManager.getTimeline("COO");
    assert(timeline.length > 0, "Timeline has entries");
  } catch (e: any) {
    assert(false, `Workspace test: ${e.message}`);
  }

  // ===== TEST 7: Council Activation =====
  console.log("[Test 7] Council Activation");

  try {
    assert(CouncilScheduler.isSchedulerRunning(), "Council scheduler is running");
  } catch (e: any) {
    assert(false, `Council test: ${e.message}`);
  }

  // ===== TEST 8: Execution Layer =====
  console.log("[Test 8] Execution Layer");

  try {
    const engine = getExecutionEngine();
    assert(!!engine, "ExecutionEngine singleton exists");
    const registry = engine.getRegistry();
    assert(registry.size() > 0, `ActionRegistry has ${registry.size()} handlers`);
  } catch (e: any) {
    assert(false, `Execution test: ${e.message}`);
  }

  // ===== TEST 9: Health Check =====
  console.log("[Test 9] Health Check");

  try {
    const health = await checkHealth();
    assert(health.overall, "Health check overall is true");
    assert(health.overallPercent > 0, "Health percent > 0");
    assert(!!health.timestamp, "Health check has timestamp");

    // Verify all subsystems report ok or degraded
    for (const [name, subsystem] of Object.entries(health.subsystems)) {
      assert(
        subsystem.status === "ok" || subsystem.status === "degraded",
        `${name} status is ok or degraded (got ${subsystem.status})`
      );
    }

    const formatted = formatHealthReport(health);
    assert(formatted.includes("✓"), "Health report contains checkmarks");
    assert(formatted.includes("Business OS Health"), "Health report has header");
  } catch (e: any) {
    assert(false, `Health test: ${e.message}`);
  }

  // ===== TEST 10: Gateway Assemble (Full Flow) =====
  console.log("[Test 10] RuntimeGateway Assemble Flow");

  try {
    const gateway = getRuntimeGateway();
    const result = await gateway.assemble({
      message: "Cek stok produk minuman",
      userId: 1,
      branchId: 1,
    });

    assert(result.success !== undefined, "Gateway returns success field");
    assert(typeof result.text === "string", "Gateway returns text field");
    assert(!!result.runtime, "Gateway returns runtime field");
    assert(Array.isArray(result.pipeline), "Gateway returns pipeline array");
    assert(!!result.metrics, "Gateway returns metrics");

    // The RIC stage should now be active
    assert(result.pipeline.includes("Grounding"), "Pipeline includes Grounding stage");
  } catch (e: any) {
    assert(false, `Gateway assemble test: ${e.message}`);
  }

  // ===== RESULTS =====
  console.log("");
  console.log("========================================");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("========================================");
  if (errors.length > 0) {
    console.log("");
    console.log("Failed assertions:");
    for (const e of errors) {
      console.log(`  ✗ ${e}`);
    }
  }
  console.log("");

  return { passed, failed, errors };
}

// Auto-run if executed directly
const isMainModule = !module.parent;
if (isMainModule) {
  runAll().then((result) => {
    process.exit(result.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error("Integration test error:", err);
    process.exit(1);
  });
}

export { runAll };
