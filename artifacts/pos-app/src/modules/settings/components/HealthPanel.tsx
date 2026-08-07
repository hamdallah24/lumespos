// HealthPanel — ConfigCenter live health overview (read-only).
// Combines the locked M1 /health report with the additive M3 Phase 2 live
// views (/health/summary, diagnostics, readiness, liveness, metrics).

import { useEffect, useState } from "react";
import { settingsApi, type HealthResponse, type HealthSummaryResponse, type HealthReadinessResponse, type HealthLivenessResponse } from "../api";

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

export default function HealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summary, setSummary] = useState<HealthSummaryResponse | null>(null);
  const [readiness, setReadiness] = useState<HealthReadinessResponse | null>(null);
  const [liveness, setLiveness] = useState<HealthLivenessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    settingsApi.health().then(setHealth).catch((err) => setError((err as Error).message));
    settingsApi.healthSummary().then(setSummary).catch(() => undefined);
    settingsApi.healthReadiness().then(setReadiness).catch(() => undefined);
    settingsApi.healthLiveness().then(setLiveness).catch(() => undefined);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="p-6 text-sm text-red-400">{error}</div>;
  if (!health) return <div className="p-6 text-sm text-white/40 animate-pulse">Checking health…</div>;

  const diagStatus = summary?.status ?? health.status;

  return (
    <div className="h-full bg-[#0B1220] text-white overflow-y-auto p-6">
      <div className="max-w-3xl space-y-4">
        <header className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">ConfigCenter Health</h3>
          <Badge status={diagStatus} />
          {liveness ? (
            <span className="text-[10px] text-white/30 font-mono">
              liveness {liveness.alive ? "alive" : "dead"} · {new Date(liveness.stamp).toLocaleTimeString()}
            </span>
          ) : null}
        </header>

        {readiness ? (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${readiness.ready ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-amber-500/20 bg-amber-500/5 text-amber-300"}`}>
            {readiness.ready ? "Ready" : "Not ready"} · {readiness.checks.filter((c) => c.status !== "ok").length} non-ok checks
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card title="Registry">
            <span className="flex items-center gap-2"><Badge status={health.registry.status} /> {health.registry.fieldCount} fields · {health.registry.groupCount} groups</span>
            <p className="font-mono text-[10px] text-white/30 mt-1">checksum {health.registry.checksum}</p>
          </Card>
          <Card title="Store">
            <span className="flex items-center gap-2"><Badge status={health.store.status} /> revision {health.store.revision} · {health.store.overrideCount} overrides</span>
          </Card>
          <Card title="Resolver">
            <span className="flex items-center gap-2"><Badge status={health.resolver.status} /> cache {health.resolver.cacheSize} · lastRevision {health.resolver.lastRevision}</span>
          </Card>
          <Card title="Event Bus">
            <span className="flex items-center gap-2"><Badge status={summary?.eventBus.status ?? health.eventBus.status} /> delivered {summary?.eventBus.deliveredRevision ?? health.eventBus.lastRevision} · {health.eventBus.subscriberCount} subscribers</span>
            {summary ? <p className="text-[10px] text-white/30 mt-1">{summary.eventBus.publishedEvents} published · store rev {summary.eventBus.storeRevision}</p> : null}
          </Card>
        </div>

        {summary ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card title="Snapshots">
              <span className="flex items-center gap-2">{summary.snapshots.count} total</span>
              <p className="text-[10px] text-white/30 mt-1">{summary.snapshots.retentionCandidates} retention candidates</p>
              <p className="text-[10px] text-white/30 mt-1">keepLatest {summary.snapshots.policy.keepLatest} · keepYoungerThanDays {summary.snapshots.policy.keepYoungerThanDays}d</p>
              {summary.snapshots.lastRestore ? <p className="text-[10px] text-emerald-400/70 mt-1">last restore {new Date(summary.snapshots.lastRestore.createdAt).toLocaleString()}</p> : <p className="text-[10px] text-white/30 mt-1">no restore yet</p>}
            </Card>
            <Card title="Readiness">
              <span className="flex items-center gap-2"><Badge status={readiness?.status ?? "ok"} /> {readiness?.ready ? "ready" : "not ready"}</span>
            </Card>
            <Card title="Live Status">
              <span className="flex items-center gap-2"><Badge status={diagStatus} /> updated {new Date(summary.updatedAt).toLocaleTimeString()}</span>
            </Card>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Diagnostics</p>
          <div className="space-y-2">
            {(readiness?.checks ?? []).map((c) => (
              <div key={c.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <span className="mt-0.5"><Badge status={c.status} /></span>
                <div>
                  <p className="text-xs font-medium text-white/80">{c.title}</p>
                  <p className="text-[10px] text-white/40 font-mono">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Capabilities</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(health.capabilities).map(([id, avail]) => (
              <span key={id} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${avail ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                {id}{avail ? " ✓" : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
