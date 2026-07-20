// ECP-036: Composition Root — Organization Kernel Bootstrap
// Kernel boot before Express. Emergency fallback if Kernel fails.

import app from "./app";
import { logger } from "./lib/logger";
import { startHealthMonitor } from "./ai/runtime/health-monitor";
import { missionEngine } from "./ai/runtime/mission-background-engine";
import { redisService } from "./lib/redis";

// ECP-037: Static Runtime imports for orchestrator registration
import { ceoRuntime } from "./executive-runtime/executives/CEO";
import { ctoProgram } from "./executive-runtime/executives/CTO";
import { cooRuntime } from "./executive-runtime/executives/COO";
import { cfoRuntime } from "./executive-runtime/executives/CFO";
import { cmoRuntime } from "./executive-runtime/executives/CMO";
import { caioRuntime } from "./executive-runtime/executives/CAIO";
import { ckoRuntime } from "./executive-runtime/executives/CKO";
import { chroRuntime } from "./executive-runtime/executives/CHRO";

// Finance Engine - subscribe to events
import "./finance/services/eventHandlers";

// ── Process-level crash handlers ──
let server: ReturnType<typeof app.listen> | null = null;

function gracefulShutdown(signal: string, error?: unknown) {
  if (error) logger.error({ err: error }, `Fatal: ${signal}`);
  else logger.warn({ signal }, "Shutdown requested");

  const timeout = setTimeout(() => {
    logger.error("Forced exit after timeout");
    process.exit(1);
  }, 10000);
  timeout.unref();

  const doExit = (code: number) => {
    missionEngine.stop();
    redisService.shutdown().finally(() => process.exit(code));
  };

  if (server) {
    server.close(async () => {
      logger.info("Server closed");
      try {
        const { shutdownEIOSRuntime } = await import("./eios-runtime");
        await shutdownEIOSRuntime();
      } catch { }
      doExit(error ? 1 : 0);
    });
  } else {
    doExit(error ? 1 : 0);
  }
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason instanceof Error ? reason : new Error(String(reason)) }, "Unhandled rejection — warning only, see pipeline error handling");
});

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Uncaught exception — initiating graceful shutdown");
  gracefulShutdown("uncaughtException", error);
});

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

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
    // Phase 0: Redis init
    await redisService.init();

    // Phase 1: Foundation Load
    const { getFoundationProvider } = await import("./ai/runtime/foundation");
    const provider = getFoundationProvider();
    logger.info({ docs: provider.documentCount }, "Foundation loaded");

    // Preload foundation cache into Redis
    const { preloadFoundationCache } = await import("./ai/runtime/foundation/foundation-cache");
    await preloadFoundationCache();

    // Phase 2: Organization Kernel (must start before EIOS)
    const { organizationKernel } = await import("./kernel");
    await organizationKernel.start();
    logger.info({ state: organizationKernel.state }, "Kernel booted");

    // Phase 3: Event Schema Registry bootstrap
    const { registerAllEventSchemas } = await import("./event-schema/bootstrap");
    registerAllEventSchemas();
    logger.info({ eventTypes: 14 }, "Event schema registry bootstrapped");

    // Phase 4: EIOS Runtime bootstrap (initializes ALL layers — stages, observers, profiles, registries, governance)
    const { initializeEIOSRuntime, schedulePipeline, ExecutiveDispatchRegistry } = await import("./eios-runtime");

    await initializeEIOSRuntime();

    ExecutiveDispatchRegistry.register({ role: "CEO", decide: ceoRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "CTO", decide: ctoProgram.decide });
    ExecutiveDispatchRegistry.register({ role: "CFO", decide: cfoRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "CMO", decide: cmoRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "CAIO", decide: caioRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "CKO", decide: ckoRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "CHRO", decide: chroRuntime.decide });
    ExecutiveDispatchRegistry.register({ role: "COO", decide: cooRuntime.decide });

    schedulePipeline(30000);
    logger.info("[EIOS] Runtime v4.1.1 active — 11 stages, 6 observers, 7 profiles, 8 executives");

    // T12.1: Initialize Runtime Intelligence Core (RIC) — cognitive kernel
    try {
      const { initializeRIC } = await import("./runtime-intelligence-core/RICAdapter");
      await initializeRIC(process.cwd());
      logger.info("[RIC] Runtime Intelligence Core initialized — Awareness, Understanding, Planning, Grounding, Verification active");
      const { registerExecutionEngine } = await import("./runtime-intelligence-core/RICAdapter");
      registerExecutionEngine();
    } catch (err) {
      logger.warn({ err }, "[RIC] Runtime Intelligence Core initialization skipped");
    }

    // ECP-037 P1: Activate Knowledge Pipeline
    const { knowledgeManager } = await import("./ai/runtime/knowledge/knowledge-manager");
    knowledgeManager.start();
    logger.info("Knowledge Manager started — queue subscriber active");

    // T5.1.3: Initialize Knowledge Platform (once)
    const { initializeKnowledgePlatform } = await import("./knowledge-platform");
    initializeKnowledgePlatform();
    logger.info("Knowledge Platform initialized — Learning Engine listener active");

    // T5.3A: Register all learning engines in the integration registry
    const { registerAllEngines, IntegrationManager } = await import("./learning-integration");
    registerAllEngines();
    logger.info(`Learning Integration Layer active — ${IntegrationManager.discover().length} engines registered`);

    // T5.5A: Activate Learning Telemetry (instrumentation layer, non-intrusive)
    const { activateLearningTelemetry } = await import("./learning-effectiveness");
    activateLearningTelemetry();
    logger.info("Learning Telemetry active — all learning interactions instrumented");

    const { safeSchedule } = await import("./kernel/scheduler-safety");

    // T5.1.1: Schedule Org Learning Cycle (daily) — processes pending queue items
    safeSchedule("learning-cycle", 86400000, async () => {
      const { learningEngine } = await import("./learning/learning-engine");
      const result = learningEngine.autoCycle();
      logger.info({ decisionsAnalyzed: result.decisionsAnalyzed, patternsDetected: result.patternsDetected }, "Learning cycle complete");
    });
    logger.info("Learning cycle auto-scheduled — daily");

    // T5.1.2: Schedule Memory Engine Maintenance (6-hourly)
    safeSchedule("memory-maintenance", 21600000, async () => {
      const { memoryEngine } = await import("./executive-runtime/memory-provider");
      const result = memoryEngine.runMaintenanceCycle();
      logger.info({ promoted: result.promoted.promoted.length, consolidated: result.consolidated.consolidated.length, forgotten: result.forgotten.forgotten.length }, "Memory maintenance complete");
    });
    logger.info("Memory maintenance scheduled — every 6h");

    // T5.1.4: Schedule Knowledge Platform Maintenance (hourly) — runs processOutcome + runMaintenance
    safeSchedule("kp-maintenance", 3600000, async () => {
      const { KnowledgeProvider } = await import("./knowledge-platform/providers");
      const outcomesProcessed = KnowledgeProvider.processEpisodeOutcomes();
      const maintenance = KnowledgeProvider.runMaintenance();
      logger.info({ outcomesProcessed, promoted: maintenance.promoted.length, deprecated: maintenance.deprecated.length, archived: maintenance.archived.length }, "Knowledge Platform maintenance complete");
    });
    logger.info("Knowledge Platform maintenance scheduled — hourly");

    // T5.3.5: Schedule Cross-Engine Synchronization (every 6 hours)
    safeSchedule("cross-engine-sync", 21600000, async () => {
      const { UnifiedLearningLayer } = await import("./learning/unified-learning-layer");
      const syncResult = UnifiedLearningLayer.synchronize();
      if (syncResult.synced > 0) {
        logger.info({ synced: syncResult.synced, details: syncResult.details }, "Cross-engine sync complete");
      }
      // T5.3A: IntegrationManager maintenance across all registered engines
      try {
        const { IntegrationManager } = await import("./learning-integration");
        const maintenanceResults = IntegrationManager.runMaintenance();
        for (const r of maintenanceResults) {
          if (r.actions > 0) logger.info({ engine: r.engine, actions: r.actions, details: r.details }, "Integration maintenance");
        }
        const healthStatuses = IntegrationManager.health();
        logger.info({ engines: healthStatuses.map((h: any) => `${h.engine}=${h.status}`).join(", ") }, "Integration engine health");
      } catch { /* non-critical */ }
      // Unified retrieval health check
      const unifiedEvidence = UnifiedLearningLayer.retrieve({ mission: "health-check", maxResults: 5 });
      logger.info({ sources: [...new Set(unifiedEvidence.map(e => e.source))], total: unifiedEvidence.length }, "Unified retrieval health check");
    });
    logger.info("Cross-engine synchronization scheduled — every 6h");

    // T5.1.6: Schedule Knowledge Queue Pruning (hourly)
    safeSchedule("knowledge-queue-prune", 3600000, async () => {
      const { knowledgeQueue } = await import("./learning/knowledge-queue");
      const pruned = knowledgeQueue.prune();
      if (pruned > 0) logger.info({ pruned }, "Knowledge queue pruned");
    });
    logger.info("Knowledge queue pruning scheduled — hourly");

    // T14R: Auto-close stale shifts from previous calendar days (hourly)
    safeSchedule("shift-auto-close", 3600000, async () => {
      try {
        const { db, shiftAuditsTable } = await import("@workspace/db");
        const { eq, and, lt, sql } = await import("drizzle-orm");
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const staleShifts = await db
          .select()
          .from(shiftAuditsTable)
          .where(
            and(
              eq(shiftAuditsTable.status, "active"),
              lt(shiftAuditsTable.shiftStart, today)
            )
          );
        if (staleShifts.length > 0) {
          for (const s of staleShifts) {
            await db.update(shiftAuditsTable)
              .set({
                status: "confirmed",
                shiftEnd: today,
                notes: (s.notes ? s.notes + " | " : "") + "Auto-closed: daily reset",
              })
              .where(eq(shiftAuditsTable.id, s.id));
          }
          logger.info({ count: staleShifts.length }, "Auto-closed stale shifts from previous day(s)");
        }
      } catch (err) {
        logger.warn({ err }, "Shift auto-close task failed");
      }
    });
    logger.info("Shift auto-close scheduled — hourly");

    // ECP-037 P1: Subscribe Telemetry to event bus
    const { eventBus } = await import("./ai/runtime/observability/event-bus");
    eventBus.subscribe("trace_started", (event: any) => {
      logger.info({ traceId: event.payload }, "Telemetry: trace started");
    });
    eventBus.subscribe("trace_completed", (event: any) => {
      logger.info({ traceId: event.payload }, "Telemetry: trace completed");
    });
    eventBus.subscribe("decision_made", (event: any) => {
      logger.info({ decision: event.payload }, "Telemetry: decision recorded");
    });
    logger.info("Telemetry subscribers active");

  } catch (err) {
    logger.error({ err }, "Kernel boot failed");
  }
}

// ECP-036: Boot organization first, then start Express
boot().then(() => {
  server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      gracefulShutdown("listen_error", err);
      return;
    }

    logger.info({ port }, "Server listening");
    startHealthMonitor();
    missionEngine.start();

    // Start CKO scheduler for background maintenance
    import("./programs/consultant").then(({ consultantScheduler }) => {
      consultantScheduler.start();
      logger.info("CKO scheduler started — daily knowledge maintenance");
    }).catch((e: unknown) => {
      logger.warn({ err: e }, "CKO scheduler failed to start — non-critical");
    });
  });
});
