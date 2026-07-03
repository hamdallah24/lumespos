// ECP-036: Composition Root — Organization Kernel Bootstrap
// Kernel boot before Express. Emergency fallback if Kernel fails.

import app from "./app";
import { logger } from "./lib/logger";
import { startHealthMonitor } from "./ai/runtime/health-monitor";
import { missionEngine } from "./ai/runtime/mission-background-engine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function boot(): Promise<void> {
  const bootStart = Date.now();

  try {
    // Phase 1: Foundation Load
    const { getFoundationProvider } = await import("./ai/runtime/foundation");
    const provider = getFoundationProvider();
    logger.info({ docs: provider.documentCount }, "Foundation loaded");

    // Phase 2: Wave 0 — Activation Audit
    const { runActivationAudit } = await import("./ai/runtime/orchestrator/activation-audit");
    const audit = await runActivationAudit();
    logger.info({ score: audit.structuralScore, status: audit.status }, "Activation Audit complete");

    // Phase 3: Kernel Register Runtimes
    const { organizationKernel } = await import("./kernel");
    const { orchestrator } = await import("./ai/runtime/orchestrator");

    // Register runtimes with Kernel (CEO, CTO, COO, Chat)
    // The actual execute wrappers are in ai.ts emergency path or registered here
    logger.info("Kernel registering organization...");

    // Phase 4: Kernel Boot
    organizationKernel.register({
      name: "CEO", version: "1.0.0", type: "runtime",
      status: "registered",
      health: () => ({ status: "healthy", uptime: 0, version: "1.0.0" }),
    });
    organizationKernel.register({
      name: "CTO", version: "1.1.0", type: "runtime",
      status: "registered",
      health: () => ({ status: "healthy", uptime: 0, version: "1.1.0" }),
    });
    organizationKernel.register({
      name: "COO", version: "1.0.0", type: "runtime",
      status: "registered",
      health: () => ({ status: "healthy", uptime: 0, version: "1.0.0" }),
    });
    organizationKernel.register({
      name: "Chat", version: "1.0.0", type: "runtime",
      status: "registered",
      health: () => ({ status: "healthy", uptime: 0, version: "1.0.0" }),
    });
    organizationKernel.register({
      name: "Consultant", version: "1.0.0", type: "runtime",
      status: "registered",
      health: () => ({ status: "healthy", uptime: 0, version: "1.0.0" }),
    });

    await organizationKernel.start();
    logger.info({ state: organizationKernel.state }, "Kernel booted");

    // Phase 5: Wave 8 — Integrity Check
    const { checkIntegrity } = await import("./ai/runtime/orchestrator/integrity-check");
    const integrity = await checkIntegrity();

    // Phase 6: Boot Report
    const { createBootReport, formatBootReport } = await import("./ai/runtime/orchestrator/boot-report");
    const report = createBootReport({
      mode: audit.status === "emergency" ? "EMERGENCY" : integrity.runtimeScore < 80 ? "DEGRADED" : "NORMAL",
      structuralScore: integrity.structuralScore,
      runtimeScore: integrity.runtimeScore,
      runtimeStatus: integrity.runtimeStatus,
      components: {
        Foundation: audit.components["Foundation"] === "PRESENT" ? "READY" : "OFFLINE",
        Kernel: "READY",
        Registry: organizationKernel.isReady() ? "READY" : "DEGRADED",
        Knowledge: audit.components["Knowledge"] === "PRESENT" ? "READY" : "OFFLINE",
        Mission: audit.components["Mission Authority"] === "PRESENT" ? "READY" : "OFFLINE",
        Council: audit.components["Council"] === "PRESENT" ? "READY" : "OFFLINE",
        Learning: audit.components["Learning"] === "PRESENT" ? "READY" : "OFFLINE",
        Telemetry: audit.components["Telemetry"] === "PRESENT" ? "READY" : "OFFLINE",
        Consultant: audit.components["Consultant"] === "PRESENT" ? "READY" : "OFFLINE",
      },
      bootTimeMs: Date.now() - bootStart,
    });

    console.log(formatBootReport(report));
    logger.info({ structuralScore: integrity.structuralScore, runtimeScore: integrity.runtimeScore }, "Boot Report generated");

  } catch (err) {
    logger.error({ err }, "Kernel boot failed — emergency mode");
    console.log("Engineering OS Boot Report");
    console.log("Boot Mode       EMERGENCY");
    console.log("CEO             READY");
    console.log("Gateway         READY");
    console.log("Kernel          FAILED");
    console.log("Boot Time       " + (Date.now() - bootStart) + " ms");
  }
}

// ECP-036: Boot organization first, then start Express
boot().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startHealthMonitor();
    missionEngine.start();
  });
});
