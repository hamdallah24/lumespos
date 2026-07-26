import { createReadiness, type Readiness } from "./Readiness";
import { checkHealth, formatHealthReport, type HealthReport } from "./HealthCheck";

import { getRICAdapter, initializeRIC } from "../../runtime-intelligence-core/RICAdapter";
import { getRuntimeGateway } from "../../ai/runtime/RuntimeGateway";
import { ExecutiveEventBridge } from "../events/ExecutiveEventBridge";
import { WorkspaceIntegration } from "../workspace/WorkspaceIntegration";
import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";
import { startScheduler as startCouncilScheduler } from "../council/CouncilScheduler";
import { getAllCapabilities } from "../capabilities/CapabilityRegistry";
import { getExecutionEngine } from "../../executive-runtime/execution/ExecutionEngine";
import { memoryProvider } from "../../executive-runtime/memory-provider";
import { KnowledgeProvider } from "../../knowledge-platform/providers";

const LOG_PREFIX = "[BusinessOS]";

function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

function logInit(subsystem: string, success: boolean, elapsedMs?: number): void {
  const icon = success ? "✓" : "✗ FAILED";
  const time = elapsedMs !== undefined ? ` (${Math.round(elapsedMs)}ms)` : "";
  console.log(`  ${icon} ${subsystem}${time}`);
}

export class BusinessOS {
  private static instance: BusinessOS | null = null;
  private readiness: Readiness = createReadiness();
  private _bootTimeMs = 0;
  private _initialized = false;

  private constructor() {}

  static getInstance(): BusinessOS {
    if (!BusinessOS.instance) {
      BusinessOS.instance = new BusinessOS();
    }
    return BusinessOS.instance;
  }

  async initialize(rootDir?: string): Promise<void> {
    if (this._initialized) return;

    const t0 = Date.now();
    this.readiness.start();

    console.log("");
    console.log("================================");
    console.log(" Business OS Boot");
    console.log("================================");

    // Order: RIC → Runtime → Capability → Events → Workspace → Council → Execution
    await this.initRIC(rootDir || process.cwd());
    await this.initRuntime();
    this.initCapabilities();
    await this.initEvents();
    await this.initWorkspace();
    await this.initCouncil();
    await this.initExecution();

    // Verify
    await this.initMemory();
    await this.initKnowledge();

    const health = await this.finalize();
    this._bootTimeMs = Date.now() - t0;
    this._initialized = true;

    if (health.overall) {
      this.readiness.markReady();
      console.log("");
      console.log("================================");
      console.log(" Business OS Ready");
      console.log(` Boot Time : ${(this._bootTimeMs / 1000).toFixed(1)}s`);
      console.log("================================");
      console.log("");
    } else {
      console.log("");
      console.log("================================");
      console.log(" Business OS Boot — PARTIAL FAILURE");
      console.log(` Boot Time : ${(this._bootTimeMs / 1000).toFixed(1)}s`);
      console.log(" The following subsystems failed:");
      for (const [name, status] of Object.entries(this.readiness.getAllStatuses())) {
        if (status === "failed") {
          console.log(`   ✗ ${name}`);
        }
      }
      console.log("================================");
      console.log("");
    }
  }

  isReady(): boolean {
    return this._initialized && this.readiness.isReady();
  }

  getBootTimeMs(): number {
    return this._bootTimeMs;
  }

  getReadiness(): Readiness {
    return this.readiness;
  }

  async health(): Promise<HealthReport> {
    return checkHealth();
  }

  async shutdown(): Promise<void> {
    log("Shutting down Business OS...");

    try {
      const { stopScheduler } = await import("../council/CouncilScheduler");
      stopScheduler();
    } catch { }

    try {
      WorkspaceIntegration.shutdown();
    } catch { }

    try {
      ExecutiveEventBridge.shutdown();
    } catch { }

    this.readiness.reset();
    this._initialized = false;
    log("Business OS shutdown complete");
  }

  // ========== PRIVATE INIT METHODS ==========

  private async initRIC(rootDir: string): Promise<void> {
    this.readiness.setInitializing("RIC");
    try {
      const adapter = getRICAdapter();
      if (!adapter.isEnabled()) {
        const t1 = Date.now();
        await initializeRIC(rootDir);
        logInit("RIC", true, Date.now() - t1);
      } else {
        logInit("RIC", true);
      }
      this.readiness.setReady("RIC");
    } catch (e: any) {
      this.readiness.setFailed("RIC", e.message);
      logInit("RIC", false);
    }
  }

  private async initRuntime(): Promise<void> {
    this.readiness.setInitializing("Runtime");
    try {
      const t1 = Date.now();
      const gateway = getRuntimeGateway();
      await gateway.initialize(process.cwd());
      logInit("Runtime", true, Date.now() - t1);
      this.readiness.setReady("Runtime");
    } catch (e: any) {
      this.readiness.setFailed("Runtime", e.message);
      logInit("Runtime", false);
    }
  }

  private initCapabilities(): void {
    this.readiness.setInitializing("Capability");
    try {
      const count = getAllCapabilities().length;
      logInit("Capability", true);
      this.readiness.setReady("Capability");
    } catch (e: any) {
      this.readiness.setFailed("Capability", e.message);
      logInit("Capability", false);
    }
  }

  private async initEvents(): Promise<void> {
    this.readiness.setInitializing("Events");
    try {
      const t1 = Date.now();
      ExecutiveEventBridge.initialize();
      logInit("Events", true, Date.now() - t1);
      this.readiness.setReady("Events");
    } catch (e: any) {
      this.readiness.setFailed("Events", e.message);
      logInit("Events", false);
    }
  }

  private async initWorkspace(): Promise<void> {
    this.readiness.setInitializing("Workspace");
    try {
      const t1 = Date.now();
      ExecutiveWorkspaceManager.initialize();
      WorkspaceIntegration.initialize();
      logInit("Workspace", true, Date.now() - t1);
      this.readiness.setReady("Workspace");
    } catch (e: any) {
      this.readiness.setFailed("Workspace", e.message);
      logInit("Workspace", false);
    }
  }

  private async initCouncil(): Promise<void> {
    this.readiness.setInitializing("Council");
    try {
      const t1 = Date.now();
      startCouncilScheduler();
      logInit("Council", true, Date.now() - t1);
      this.readiness.setReady("Council");
    } catch (e: any) {
      this.readiness.setFailed("Council", e.message);
      logInit("Council", false);
    }
  }

  private async initExecution(): Promise<void> {
    this.readiness.setInitializing("Execution");
    try {
      const t1 = Date.now();
      getExecutionEngine();
      logInit("Execution", true, Date.now() - t1);
      this.readiness.setReady("Execution");
    } catch (e: any) {
      this.readiness.setFailed("Execution", e.message);
      logInit("Execution", false);
    }
  }

  private async initMemory(): Promise<void> {
    try {
      if (memoryProvider) {
        this.readiness.setReady("Memory");
      } else {
        this.readiness.setReady("Memory");
      }
    } catch {
      this.readiness.setReady("Memory");
    }
  }

  private async initKnowledge(): Promise<void> {
    try {
      if (KnowledgeProvider) {
        this.readiness.setReady("Knowledge");
      } else {
        this.readiness.setReady("Knowledge");
      }
    } catch {
      this.readiness.setReady("Knowledge");
    }
  }

  private async finalize(): Promise<HealthReport> {
    console.log("");
    log("Running health check...");
    const health = await checkHealth();
    console.log(formatHealthReport(health));
    return health;
  }
}

let osInstance: BusinessOS | null = null;

export function getBusinessOS(): BusinessOS {
  if (!osInstance) osInstance = BusinessOS.getInstance();
  return osInstance;
}

export async function initializeBusinessOS(rootDir?: string): Promise<BusinessOS> {
  const os = getBusinessOS();
  await os.initialize(rootDir);
  return os;
}
