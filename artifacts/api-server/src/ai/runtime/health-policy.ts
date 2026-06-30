// SPRINT 4: Health Policy — weighted health score with breakdown
// Not just "healthy/unhealthy" — scores + explains deductions

interface ScoreComponent {
  name: string;
  weight: number;       // 0-100
  score: number;        // 0-100 within this component
  status: "healthy" | "degraded" | "unhealthy";
  detail: string;       // human-readable explanation
}

let _lastScore: { total: number; components: ScoreComponent[]; timestamp: string } | null = null;

/** Compute the weighted health score (asynchronous — fetches monitor data) */
export async function computeHealthScore(): Promise<{ total: number; components: ScoreComponent[]; timestamp: string }> {
  const components: ScoreComponent[] = [];

  // 1. DeepSeek (weight: 35)
  try {
    const { deepseekBreaker } = await import("./circuit-breaker");
    const ds = deepseekBreaker.status();
    const dsScore = ds.state === "CLOSED" ? 100 : ds.state === "HALF_OPEN" ? 50 : 0;
    components.push({
      name: "DeepSeek",
      weight: 35,
      score: dsScore,
      status: dsScore >= 80 ? "healthy" : dsScore >= 40 ? "degraded" : "unhealthy",
      detail: ds.state === "CLOSED" ? "OK" : `${ds.state} (${ds.failureCount} failures)`,
    });
  } catch {
    components.push({ name: "DeepSeek", weight: 35, score: 0, status: "unhealthy", detail: "Not initialized" });
  }

  // 2. GitHub (weight: 15)
  try {
    const { githubBreaker } = await import("./circuit-breaker");
    const gh = githubBreaker.status();
    const ghScore = gh.state === "CLOSED" ? 100 : gh.state === "HALF_OPEN" ? 50 : 0;
    components.push({
      name: "GitHub", weight: 15, score: ghScore,
      status: ghScore >= 80 ? "healthy" : ghScore >= 40 ? "degraded" : "unhealthy",
      detail: gh.state === "CLOSED" ? "OK" : `${gh.state}`,
    });
  } catch {
    components.push({ name: "GitHub", weight: 15, score: 80, status: "healthy", detail: "Not tracked" });
  }

  // 3. SSH (weight: 15)
  try {
    const { sshBreaker } = await import("./circuit-breaker");
    const sh = sshBreaker.status();
    const shScore = sh.state === "CLOSED" ? 100 : sh.state === "HALF_OPEN" ? 50 : 0;
    components.push({
      name: "SSH", weight: 15, score: shScore,
      status: shScore >= 80 ? "healthy" : shScore >= 40 ? "degraded" : "unhealthy",
      detail: sh.state === "CLOSED" ? "OK" : `${sh.state}`,
    });
  } catch {
    components.push({ name: "SSH", weight: 15, score: 80, status: "healthy", detail: "Not tracked" });
  }

  // 4. System Resources (weight: 20)
  try {
    const os = await import("os");
    const cpuLoad = os.loadavg()[0];
    const ramPct = (1 - os.freemem() / os.totalmem()) * 100;
    let sysScore = 100;

    const deductions: string[] = [];
    if (cpuLoad > 2.0) { sysScore -= 20; deductions.push(`CPU load ${cpuLoad.toFixed(1)}`); }
    if (cpuLoad > 4.0) { sysScore -= 15; }
    if (ramPct > 80) { sysScore -= 20; deductions.push(`RAM ${ramPct.toFixed(0)}%`); }
    if (ramPct > 90) { sysScore -= 15; }

    components.push({
      name: "System", weight: 20, score: sysScore,
      status: sysScore >= 80 ? "healthy" : sysScore >= 50 ? "degraded" : "unhealthy",
      detail: deductions.length > 0 ? deductions.join(", ") : "OK",
    });
  } catch {
    components.push({ name: "System", weight: 20, score: 80, status: "healthy", detail: "Not measured" });
  }

  // 5. Runtime Health (weight: 15)
  try {
    const { health } = await import("./registry");
    const h = health();
    const allHealthy = Object.values(h).every((v: any) => v?.status === "healthy");
    components.push({
      name: "Runtime", weight: 15, score: allHealthy ? 100 : 70,
      status: allHealthy ? "healthy" : "degraded",
      detail: `${Object.keys(h).length} components, ${allHealthy ? "all healthy" : "some degraded"}`,
    });
  } catch {
    components.push({ name: "Runtime", weight: 15, score: 80, status: "healthy", detail: "Not tracked" });
  }

  // Compute weighted total
  const total = Math.round(
    components.reduce((sum, c) => sum + c.score * (c.weight / 100), 0)
  );

  _lastScore = { total, components, timestamp: new Date().toISOString() };
  return _lastScore;
}

/** Get the last computed score */
export function lastScore() {
  return _lastScore;
}

/** Format score as markdown table */
export function scoreReport(): string {
  if (!_lastScore) return "No health score computed yet.";

  const statusIcon = _lastScore.total >= 90 ? "🟢" : _lastScore.total >= 70 ? "🟡" : "🔴";
  const lines = [
    `## Health Score: ${statusIcon} ${_lastScore.total}/100`,
    ``,
    `| Component | Weight | Score | Status | Detail |`,
    `|-----------|--------|-------|--------|--------|`,
  ];

  for (const c of _lastScore.components) {
    const icon = c.status === "healthy" ? "🟢" : c.status === "degraded" ? "🟡" : "🔴";
    lines.push(`| ${c.name} | ${c.weight}% | ${c.score} | ${icon} ${c.status} | ${c.detail} |`);
  }

  return lines.join("\n");
}

// Component metadata
export const healthPolicy = {
  name: "HealthPolicy",
  version: "1.0.0",
  capabilities: ["health-scoring", "weighted-metrics", "degradation-detection"],
  dependencies: ["CircuitBreaker", "HealthMonitor", "Registry"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
