// MaintenanceDashboard — ConfigCenter automatic operations (read-only).
// Mirrors the M4 Phase 4 BackgroundMaintenanceService: one continuous cycle
// (retention → integrity → gc → drift → health) with operational metrics,
// cycle history and a manual run trigger.

import { useEffect, useState } from "react";
import { Play, RotateCw } from "lucide-react";
import { settingsApi, type MaintenanceStatusResponse, type MaintenanceCycle } from "../api";

function Badge({ status }: { status: string }) {
  const color = status === "ok" ? "text-emerald-400 bg-emerald-500/10" : status === "degraded" ? "text-amber-400 bg-amber-500/10" : "text-red-400 bg-red-500/10";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${color}`}>{status}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{title}</p>
      <div className="mt-1 text-sm text-white/80">{children}</div>
    </div>
  );
}

function CycleCard({ cycle }: { cycle: MaintenanceCycle }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Badge status={cycle.status} />
        <span className="text-xs font-mono text-white/50">{cycle.cycleId.slice(0, 8)}</span>
        <span className="text-[10px] text-white/30 ml-auto">{cycle.durationMs} ms</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cycle.steps.map((s) => (
          <span
            key={s.name}
            title={s.detail ?? s.name}
            className={`rounded px-1.5 py-0.5 text-[10px] ${s.status === "ok" ? "bg-emerald-500/10 text-emerald-300" : s.status === "error" ? "bg-red-500/10 text-red-300" : "bg-white/5 text-white/40"}`}
          >
            {s.name}
            {s.status === "error" ? " ✕" : s.status === "skipped" ? " –" : ""}
          </span>
        ))}
      </div>
      {cycle.integrity ? (
        <p className="mt-2 text-[11px] text-white/50">
          integrity {cycle.integrity.checked} checked · {cycle.integrity.failures.length} failures
        </p>
      ) : null}
      {cycle.drift ? (
        <p className="text-[11px] text-white/50">drift {cycle.drift.severity} · {cycle.drift.affectedKeys.length} changed</p>
      ) : null}
      {cycle.health ? <p className="text-[11px] text-white/50">health {cycle.health.status}</p> : null}
    </div>
  );
}

export default function MaintenanceDashboard() {
  const [status, setStatus] = useState<MaintenanceStatusResponse | null>(null);
  const [history, setHistory] = useState<MaintenanceCycle[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    settingsApi.maintenance().then(setStatus).catch((err) => setError((err as Error).message));
    settingsApi.maintenanceHistory().then((h) => setHistory(h.cycles)).catch(() => undefined);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const runNow = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      await settingsApi.maintenanceRun();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (error && !status) return <div className="p-6 text-sm text-red-400">{error}</div>;
  if (!status) return <div className="p-6 text-sm text-white/40 animate-pulse">Loading maintenance…</div>;

  const m = status.metrics;

  return (
    <div className="h-full bg-[#0B1220] text-white overflow-y-auto p-6">
      <div className="max-w-3xl space-y-4">
        <header className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Automatic Operations</h3>
          {status.running ? <Badge status="degraded" /> : <Badge status={status.latestCycle?.status ?? "ok"} />}
          {status.running ? (
            <span className="text-[10px] text-white/30">running {status.currentStep}…</span>
          ) : status.latestCycle ? (
            <span className="text-[10px] text-white/30 font-mono">{status.latestCycle.cycleId.slice(0, 8)}</span>
          ) : null}
          <button
            onClick={runNow}
            disabled={running}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/15 transition disabled:opacity-50 cursor-pointer"
          >
            {running ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Run cycle
          </button>
        </header>
        {error ? <div className="text-sm text-red-400">{error}</div> : null}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card title="Total cycles">{m.totalCycles}</Card>
          <Card title="Success">{m.successCount}</Card>
          <Card title="Failures">{m.failureCount}</Card>
          <Card title="Degraded periods">{m.degradedPeriods}</Card>
          <Card title="Skipped jobs">{m.skippedJobs}</Card>
          <Card title="Avg duration">{Math.round(m.avgDurationMs)} ms</Card>
        </div>

        {status.latestCycle ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Latest cycle</p>
            <CycleCard cycle={status.latestCycle} />
          </div>
        ) : (
          <p className="text-sm text-white/40">No maintenance cycle has run yet — run one manually or wait for the scheduled job.</p>
        )}

        {history.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Cycle history</p>
            {history.map((c) => (
              <CycleCard key={c.cycleId} cycle={c} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
