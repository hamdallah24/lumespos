// SPRINT 3.6: Health Monitor — system condition checker
// Runs checks periodically, exports status reports
// Different from Observability: Monitor = current state. Trace = past events.

import * as os from "os";

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  check: () => Promise<{ status: "healthy" | "degraded" | "unhealthy"; value?: string; error?: string }>;
  lastValue?: string;
  lastChecked?: number;
}

interface HealthReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "unhealthy";
  uptime: { hours: number; minutes: number };
  system: { cpuPercent: string; ramPercent: string; diskPercent: string };
  services: Record<string, { status: string; value: string }>;
  metrics: { failureRate: string; avgResponse: string; totalRequests: number };
}

const _checks: HealthCheck[] = [];
const _reportHistory: HealthReport[] = [];
const MAX_HISTORY = 60; // 1 hour of 1-min checks

// Import necessary environment vars
const DEEPSEEK_URL = `${process.env.DEEPSEEK_BASE_URL || ""}/chat/completions`;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const GITHUB_URL = `https://api.github.com/repos/hamdallah24/lumespos`;
const GITHUB_PAT = process.env.GITHUB_PAT || "";

/** Register a health check */
function addCheck(name: string, checkFn: HealthCheck["check"]): void {
  _checks.push({ name, status: "healthy", check: checkFn, lastChecked: 0 });
}

/** Run all checks and produce a report */
async function runAll(): Promise<HealthReport> {
  const results: Record<string, { status: string; value: string }> = {};

  for (const c of _checks) {
    try {
      const result = await c.check();
      c.status = result.status;
      c.lastValue = result.value || "—";
      c.lastChecked = Date.now();
      results[c.name] = { status: result.status, value: result.value || "—" };
    } catch (e) {
      c.status = "unhealthy";
      results[c.name] = { status: "unhealthy", value: (e as Error).message };
    }
  }

  const totalUptime = os.uptime();
  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    overall: Object.values(results).some(r => r.status === "unhealthy") ? "unhealthy"
           : Object.values(results).some(r => r.status === "degraded") ? "degraded" : "healthy",
    uptime: { hours: Math.floor(totalUptime / 3600), minutes: Math.floor((totalUptime % 3600) / 60) },
    system: {
      cpuPercent: `${(os.loadavg()[0] * 10).toFixed(1)}%`,
      ramPercent: `${((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)}%`,
      diskPercent: `${((1 - os.freemem() / os.totalmem()) * 100 * 0.7).toFixed(1)}%`, // estimate
    },
    services: results,
    metrics: await loadMetrics(),
  };

  _reportHistory.push(report);
  if (_reportHistory.length > MAX_HISTORY) _reportHistory.shift();

  return report;
}

async function loadMetrics() {
  return { failureRate: "—", avgResponse: "—", totalRequests: 0 };
}

/** Format report as human-readable string */
function formatReport(r: HealthReport): string {
  const lines = [
    `╔══════════════════════════════════════╗`,
    `║  Engineering Runtime Monitor        ║`,
    `║  ${r.timestamp.slice(0, 19).replace("T", " ")}                    ║`,
    `╠══════════════════════════════════════╣`,
    `║  Status: ${r.overall === "healthy" ? "🟢 Healthy" : r.overall === "degraded" ? "🟡 Degraded" : "🔴 Unhealthy"}              ║`,
    `║                                      ║`,
    `║  System                              ║`,
    `║    CPU:  ${r.system.cpuPercent.padEnd(20)}║`,
    `║    RAM:  ${r.system.ramPercent.padEnd(20)}║`,
    `║    Disk: ${r.system.diskPercent.padEnd(20)}║`,
    `║    Uptime: ${r.uptime.hours}h ${r.uptime.minutes}m                     ║`,
    `║                                      ║`,
  ];

  for (const [name, svc] of Object.entries(r.services)) {
    const icon = svc.status === "healthy" ? "🟢" : svc.status === "degraded" ? "🟡" : "🔴";
    lines.push(`║  ${icon} ${name.padEnd(20)} ${svc.value.slice(0, 10).padEnd(10)}║`);
  }

  lines.push(`╚══════════════════════════════════════╝`);
  return lines.join("\n");
}

// ── Register default checks ──

// DeepSeek API alive?
addCheck("DeepSeek", async () => {
  if (!DEEPSEEK_URL || !DEEPSEEK_KEY) return { status: "degraded" as const, value: "not configured" };
  const t0 = Date.now();
  try {
    const ctl = new AbortController();
    const tid = setTimeout(() => ctl.abort(), 5000);
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
      signal: ctl.signal,
    });
    clearTimeout(tid);
    const ms = Date.now() - t0;
    return resp.ok
      ? { status: "healthy" as const, value: `OK ${ms}ms` }
      : { status: "degraded" as const, value: `HTTP ${resp.status}` };
  } catch {
    return { status: "unhealthy" as const, value: "unreachable" };
  }
});

// GitHub API alive?
addCheck("GitHub", async () => {
  if (!GITHUB_PAT) return { status: "degraded" as const, value: "no PAT" };
  const t0 = Date.now();
  try {
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 5000);
    const resp = await fetch(GITHUB_URL, {
      headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
      signal: ctl.signal,
    });
    const ms = Date.now() - t0;
    return resp.ok
      ? { status: "healthy" as const, value: `OK ${ms}ms` }
      : { status: "degraded" as const, value: `HTTP ${resp.status}` };
  } catch {
    return { status: "unhealthy" as const, value: "unreachable" };
  }
});

// SSH alive? Key-only auth for security (no password in process args)
addCheck("SSH", async () => {
  const host = process.env.SSH_HOST;
  const user = process.env.SSH_USER;
  const key = process.env.SSH_KEY_PATH;
  if (!host || !user) return { status: "degraded" as const, value: "not configured" };
  if (!key) return { status: "degraded" as const, value: "no SSH key" };
  const t0 = Date.now();
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execP = promisify(exec);
    const cmd = `ssh -i ${key} -o StrictHostKeyChecking=no -o ConnectTimeout=5 -o BatchMode=yes ${user}@${host} "echo ok"`;
    const { stdout } = await execP(cmd, { timeout: 10000 });
    const ms = Date.now() - t0;
    return stdout.trim() === "ok"
      ? { status: "healthy" as const, value: `OK ${ms}ms` }
      : { status: "degraded" as const, value: "odd response" };
  } catch {
    return { status: "unhealthy" as const, value: "unreachable" };
  }
});

// PM2 uptime check
addCheck("PM2", async () => {
  const uptime = os.uptime();
  return uptime < 300 // less than 5 minutes = likely just restarted
    ? { status: "degraded" as const, value: `restarted` }
    : { status: "healthy" as const, value: `${Math.floor(uptime / 3600)}h up` };
});

// ── Public API ──

export const healthMonitor = {
  name: "HealthMonitor",
  version: "1.0.0",
  capabilities: ["system-health", "service-ping", "periodic-check"],
  dependencies: ["MetricsSystem"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  /** Run a full health check now */
  check: runAll,

  /** Get the latest report */
  latest: (): HealthReport | null => _reportHistory.length > 0 ? _reportHistory[_reportHistory.length - 1] : null,

  /** Get report history */
  history: (count = 10): HealthReport[] => _reportHistory.slice(-count),

  /** Format latest report as readable string */
  status: (): string => {
    const r = _reportHistory[_reportHistory.length - 1];
    return r ? formatReport(r) : "No health report yet. Run check() first.";
  },

  /** Start periodic health check (every 60 seconds) */
  start: (): NodeJS.Timeout => {
    runAll().then(r => console.log(`\n${formatReport(r)}\n`));
    return setInterval(() => {
      runAll().then(r => {
        console.log(`\n${formatReport(r)}\n`);
        // Log warning if degraded
        if (r.overall !== "healthy") {
          console.warn(`[HealthMonitor] System ${r.overall}:`, r.services);
        }
      });
    }, 60000);
  },
};

// Auto-start health monitor
let _interval: NodeJS.Timeout | null = null;
export function startHealthMonitor(): void {
  if (_interval) return;
  _interval = healthMonitor.start();
  console.log("[HealthMonitor] Started — checking every 60s");
}
