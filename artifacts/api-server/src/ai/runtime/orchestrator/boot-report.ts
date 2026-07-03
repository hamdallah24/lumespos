// ECP-036 Wave 6: Boot Report — dual scores + component status
// Frozen. Format is stable for future Dashboard consumption.
// Displays: Boot Mode, Structural Integrity, Runtime Integrity, Component Status.

export interface BootReport {
  mode: "NORMAL" | "EMERGENCY" | "DEGRADED";
  structuralScore: number;
  runtimeScore: number;
  runtimeStatus: "healthy" | "stable" | "degraded" | "critical";
  components: Record<string, "READY" | "DEGRADED" | "OFFLINE">;
  bootTimeMs: number;
  kernelVersion: string;
}

export function formatBootReport(report: BootReport): string {
  const lines: string[] = [];
  const W = 36;

  const box = (text: string) => `║  ${text.padEnd(W - 4)}║`;

  lines.push("╔" + "═".repeat(W - 2) + "╗");
  lines.push(box("Engineering OS Boot Report"));
  lines.push(box(new Date().toISOString().slice(0, 19).replace("T", " ")));
  lines.push("╠" + "═".repeat(W - 2) + "╣");
  lines.push(box(`Boot Mode       ${report.mode}`));
  lines.push(box(""));
  lines.push(box(`Structural Integrity  ${report.structuralScore}%`));
  lines.push(box(`Runtime Integrity     ${report.runtimeScore}% (${report.runtimeStatus})`));
  lines.push(box(""));

  for (const [name, status] of Object.entries(report.components)) {
    const icon = status === "READY" ? "✅" : status === "DEGRADED" ? "⚠️" : "❌";
    lines.push(box(`${name.padEnd(18)} ${icon} ${status}`));
  }

  lines.push(box(""));
  lines.push(box(`Boot Time       ${report.bootTimeMs} ms`));
  lines.push(box(`Kernel Version  ${report.kernelVersion}`));
  lines.push("╚" + "═".repeat(W - 2) + "╝");

  return lines.join("\n");
}

export function createBootReport(overrides: Partial<BootReport> = {}): BootReport {
  return {
    mode: "NORMAL",
    structuralScore: 100,
    runtimeScore: 100,
    runtimeStatus: "healthy",
    components: {},
    bootTimeMs: 0,
    kernelVersion: "v2.0",
    ...overrides,
  };
}
