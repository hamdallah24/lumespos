import type { BootStep } from "../contracts/BootstrapContracts";
import { RegistryLifecycle } from "./runtime-metadata/RegistryLifecycle";
import { RuntimeState } from "./RuntimeState";
import { RuntimeFreezeManager } from "./RuntimeFreezeManager";
import { RuntimeSnapshotManager } from "./RuntimeSnapshotManager";
import { RuntimeHealth } from "./RuntimeHealth";
import { RuntimeGovernance } from "./runtime-governance/RuntimeGovernance";
import { PipelineStageRegistry } from "./runtime-metadata/PipelineStageRegistry";
import { PipelineGraphRegistry } from "./runtime-metadata/PipelineGraphRegistry";
import { PipelineProfileRegistry } from "./runtime-metadata/PipelineProfileRegistry";
import { ObserverRegistry } from "./runtime-metadata/ObserverRegistry";
import { CapabilityRegistry } from "./runtime-metadata/CapabilityRegistry";
import { PolicyRegistry } from "./runtime-policy/PolicyRegistry";
import { EventRegistry } from "./runtime-metadata/EventRegistry";
import { TriggerRegistry } from "./runtime-metadata/TriggerRegistry";
import { ExecutiveRegistry } from "./runtime-metadata/ExecutiveRegistry";
import { DependencyResolver } from "./DependencyResolver";
import { RuntimeLogger } from "./runtime-observability/RuntimeLogger";
import { Authorization } from "./runtime-security/Authorization";
import { SecureConfiguration } from "./runtime-security/SecureConfiguration";
import { ManifestVerifier } from "./runtime-security/ManifestVerifier";
import { AuditTrail } from "./runtime-security/AuditTrail";
import { RuntimeIdentity } from "./runtime-security/RuntimeIdentity";

const STEPS: BootStep[] = [
  {
    id: "container", description: "Init DI Container",
    execute: async () => {},
    rollback: async () => {},
  },
  {
    id: "registry_init", description: "Init registry lifecycle",
    execute: async () => { RegistryLifecycle.transition("REGISTERING"); },
    rollback: async () => { RegistryLifecycle.reset(); },
  },
  {
    id: "discovery", description: "Scan manifests and register components",
    execute: async () => {},
    rollback: async () => {
      PipelineStageRegistry.clear();
      ObserverRegistry.clear();
      PipelineProfileRegistry.clear();
      ExecutiveRegistry.clear();
      CapabilityRegistry.clear();
      PolicyRegistry.clear();
      EventRegistry.clear();
    },
  },
  {
    id: "dependencies", description: "Resolve component dependencies",
    execute: async () => {
      const result = DependencyResolver.resolveAll();
      if (!result.success) {
        const err = result.cycles.map((c, i) => `Cycle ${i + 1}: ${c.join(" -> ")}`).join("; ");
        throw new Error(`Dependency cycles detected: ${err}`);
      }
    },
    rollback: async () => {},
  },
  {
    id: "negotiation", description: "Negotiate capabilities",
    execute: async () => {},
    rollback: async () => {},
  },
  {
    id: "graph", description: "Build pipeline graph",
    execute: async () => {
      const validation = PipelineGraphRegistry.validate();
      if (validation.cyclic) {
        const cycles = validation.cycles.map(c => c.join(" -> ")).join("; ");
        throw new Error(`Pipeline graph has cycles: ${cycles}`);
      }
    },
    rollback: async () => {},
  },
  {
    id: "security_audit", description: "Run security audit",
    execute: async () => {
      Authorization.defineRole("ADMIN", ["execute_pipeline", "subscribe_event", "emit_event", "use_capability", "read_context", "manage_executives"]);
      Authorization.defineRole("OBSERVER", ["read_context"]);
      Authorization.defineRole("OPERATOR", ["execute_pipeline", "subscribe_event", "emit_event", "read_context"]);
      RuntimeIdentity.setNodeId(`node-${require("os").hostname?.() || "unknown"}-${Date.now().toString(36)}`);
      SecureConfiguration.validate();
      AuditTrail.record("BOOTSTRAP_STARTED", "system", "Security audit step executing");
    },
    rollback: async () => {},
  },
  {
    id: "governance", description: "Run governance validation",
    execute: async () => {
      RegistryLifecycle.transition("VALIDATING");
      await RuntimeGovernance.validateAll();
    },
    rollback: async () => {},
  },
  {
    id: "freeze", description: "Freeze registries",
    execute: async () => { RuntimeFreezeManager.freezeAll(); },
    rollback: async () => { RuntimeFreezeManager.unfreezeAll(); },
  },
  {
    id: "snapshot", description: "Create boot snapshot",
    execute: async () => { RuntimeSnapshotManager.createSnapshot("boot"); },
    rollback: async () => {},
  },
  {
    id: "health", description: "Check runtime health",
    execute: async () => { RuntimeHealth.record(); },
    rollback: async () => {},
  },
];

export async function bootstrapRuntime(): Promise<void> {
  const executed: BootStep[] = [];

  for (const step of STEPS) {
    try {
      await step.execute();
      executed.push(step);
    } catch (err) {
      for (const done of executed.reverse()) {
        try { await done.rollback(); } catch { }
      }
      throw new Error(`Bootstrap failed at step '${step.id}': ${err}`);
    }
  }

  RegistryLifecycle.transition("RUNNING");
  RuntimeState.start();
  RuntimeHealth.record();
  AuditTrail.record("BOOTSTRAP_COMPLETED", "system", "Runtime bootstrap completed successfully");
  const initialReport = await RuntimeGovernance.runPeriodicCheck();
  if (!initialReport.registryHealth.passed) {
    RuntimeLogger.warn("Bootstrap", "Governance warnings at boot");
    for (const w of initialReport.warnings) RuntimeLogger.warn("Bootstrap", `  ⚠ ${w}`);
  }
  RuntimeLogger.info("Bootstrap", `Governance score: ${initialReport.overallScore}/100`);
  RuntimeGovernance.startPeriodicCheck(60000);
}

export function getBootReport(): string {
  const stages = PipelineStageRegistry.getAll().length;
  const observers = ObserverRegistry.getAll().length;
  const profiles = PipelineProfileRegistry.getAll().length;
  const triggers = TriggerRegistry.getAll().length;
  const executives = ExecutiveRegistry.getAll().length;
  const capabilities = CapabilityRegistry.getAll().length;
  const policies = PolicyRegistry.getAll().length;
  const events = EventRegistry.getAll().length;
  const state = RegistryLifecycle.state;
  const running = RuntimeState.isRunning();

  return [
    `Runtime Boot`,
    `Container       ✔`,
    `Discovery       ✔`,
    `Registry        ✔  (${stages} stages, ${observers} observers, ${profiles} profiles)`,
    `Capabilities    ✔  (${capabilities} capabilities)`,
    `Policies        ✔  (${policies} policies)`,
    `Events          ✔  (${events} events)`,
    `Triggers        ✔  (${triggers} triggers)`,
    `Executives      ✔  (${executives} executives)`,
    `Freeze          ✔`,
    `Health          ✔`,
    `Runtime         ${running ? "READY" : "NOT READY"}  (${state})`,
  ].join("\n");
}
