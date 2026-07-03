// ECP-036 Wave 0: Activation Audit — pre-boot validation
// Frozen. Verifies all required organization modules exist before Kernel boots.
// Wave 0 = "Can the organization safely boot?"

export interface ActivationAudit {
  structuralScore: number;
  status: "healthy" | "degraded" | "emergency";
  components: Record<string, "PRESENT" | "MISSING">;
  missingCritical: string[];
}

const MODULES = [
  { name: "Foundation", path: "../foundation" },
  { name: "Knowledge", path: "../knowledge" },
  { name: "Mission Authority", path: "../mission-authority" },
  { name: "Council", path: "../council" },
  { name: "Learning", path: "../learning" },
  { name: "Telemetry", path: "../observability" },
  { name: "Kernel", path: "../../kernel" },
  { name: "Consultant", path: "../../programs/consultant" },
];

export async function runActivationAudit(): Promise<ActivationAudit> {
  const components: ActivationAudit["components"] = {};
  const missingCritical: string[] = [];
  let present = 0;

  for (const mod of MODULES) {
    try {
      await import(mod.path + "/index");
      components[mod.name] = "PRESENT";
      present++;
    } catch {
      components[mod.name] = "MISSING";
      if (["Foundation", "Kernel", "Mission Authority"].includes(mod.name)) {
        missingCritical.push(mod.name);
      }
    }
  }

  const score = Math.round((present / MODULES.length) * 100);

  return {
    structuralScore: score,
    status: missingCritical.length > 0 ? "emergency" : score >= 100 ? "healthy" : "degraded",
    components,
    missingCritical,
  };
}
