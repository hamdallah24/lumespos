// AuditCenter — ConfigCenter audit timeline, explorer, detail and correlation
// (read-only). Consumes the additive M3 Phase 3 audit endpoints.

import { useCallback, useEffect, useState } from "react";
import { FileSearch, Search, Download, GitBranch } from "lucide-react";
import { settingsApi, type AuditTimelineResponse, type AuditRevisionDetail, type CorrelationGraphResponse } from "../api";

function Badge({ ok, label }: { ok: boolean; label?: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ok ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>{label ?? (ok ? "ok" : "fail")}</span>;
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AuditCenter() {
  const [view, setView] = useState<"timeline" | "explorer">("timeline");
  const [timeline, setTimeline] = useState<AuditTimelineResponse | null>(null);
  const [detail, setDetail] = useState<AuditRevisionDetail | null>(null);
  const [graph, setGraph] = useState<CorrelationGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const loadTimeline = useCallback(async (query?: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const data = view === "explorer"
        ? await settingsApi.auditSearch(query)
        : await settingsApi.auditTimeline(query ? { limit: 100 } : {});
      setTimeline(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { loadTimeline(); }, [loadTimeline]);

  const openRevision = async (rev: number) => {
    setError(null);
    try {
      const d = await settingsApi.auditRevision(rev);
      setDetail(d);
      setGraph(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const openCorrelation = async (correlationId: string) => {
    setError(null);
    try {
      const g = await settingsApi.auditCorrelation(correlationId);
      setGraph(g);
      setDetail(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const exportCsv = () => {
    const a = document.createElement("a");
    a.href = "/api/v1/settings/audit/export";
    a.download = "audit.csv";
    a.click();
  };

  const applySearch = () => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) if (v.trim() !== "") cleaned[k] = v.trim();
    loadTimeline(cleaned);
  };

  const eventRows = timeline?.events ?? [];

  return (
    <div className="h-full bg-[#0B1220] text-white overflow-y-auto p-6">
      <div className="max-w-4xl space-y-4">
        <header className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Audit Center</h3>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setView("timeline")} className={`px-3 py-1 text-[12px] cursor-pointer ${view === "timeline" ? "bg-white/10 text-white" : "text-white/40"}`}>Timeline</button>
            <button onClick={() => setView("explorer")} className={`px-3 py-1 text-[12px] cursor-pointer ${view === "explorer" ? "bg-white/10 text-white" : "text-white/40"}`}>Explorer</button>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1 text-[12px] text-white/60 hover:text-white cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </header>

        {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">{error}</div> : null}

        {view === "explorer" ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Explorer — filters</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(["actor", "scopeType", "revision", "correlationId", "triggerType", "status"] as const).map((k) => (
                <input
                  key={k}
                  value={filters[k] ?? ""}
                  placeholder={k}
                  onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-transparent px-2.5 py-1.5 text-[12px] text-white/80 placeholder:text-white/25 outline-none focus:border-white/30"
                />
              ))}
            </div>
            <button onClick={applySearch} className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-white/15">
              <Search className="h-3.5 w-3.5" /> Search
            </button>
          </div>
        ) : null}

        <div className="space-y-2">
          {loading ? (
            <div className="p-6 text-sm text-white/40 animate-pulse">Loading audit…</div>
          ) : eventRows.length === 0 ? (
            <div className="p-6 text-sm text-white/40">No audit events yet.</div>
          ) : (
            eventRows.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                <div className="flex min-w-[64px] flex-col items-start">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{e.origin}</span>
                  {e.revision != null ? <span className="font-mono text-[11px] text-white/50">rev {e.revision}</span> : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/80">
                    <span className="font-mono">{e.actor ?? "—"}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white/40">{fmtTime(e.timestamp)}</span>
                    {e.correlationId ? (
                      <button onClick={() => openCorrelation(e.correlationId!)} className="flex items-center gap-1 text-[11px] text-sky-300/80 hover:text-sky-200 cursor-pointer">
                        <GitBranch className="h-3 w-3" /> {e.correlationId}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {e.changedKeys.slice(0, 8).map((k) => (
                      <span key={k} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/50">{k}</span>
                    ))}
                    {e.changedKeys.length > 8 ? <span className="text-[10px] text-white/30">+{e.changedKeys.length - 8}</span> : null}
                    {e.triggerType ? <span className="text-[10px] text-white/30">· {e.triggerType}</span> : null}
                    {e.message ? <span className="text-[10px] text-white/30">· {e.message}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge ok={(e.status ?? "COMMITTED") !== "EXPIRED"} label={e.status ?? "COMMITTED"} />
                  {e.revision != null ? (
                    <button onClick={() => openRevision(e.revision!)} className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:text-white cursor-pointer">
                      <FileSearch className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {detail ? <DetailDrawer detail={detail} onClose={() => setDetail(null)} onCorrelate={(id) => openCorrelation(id)} /> : null}
        {graph ? <GraphView graph={graph} onClose={() => setGraph(null)} /> : null}
      </div>
    </div>
  );
}

function DetailDrawer({ detail, onClose, onCorrelate }: { detail: AuditRevisionDetail; onClose: () => void; onCorrelate: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-[#0B1220] border-l border-white/10 p-6">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold">Revision {detail.revision}</h4>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer text-lg leading-none">×</button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-white/40">
          <span className="font-mono">{detail.actor}</span>·<span>{fmtTime(detail.timestamp)}</span>·<span className="font-mono">{detail.correlationId}</span>
          <button onClick={() => onCorrelate(detail.correlationId)} className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[11px] text-sky-300/80 hover:text-sky-200 cursor-pointer">
            <GitBranch className="h-3 w-3" /> correlate
          </button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Scope</p>
          <pre className="rounded-lg bg-white/[0.03] p-3 font-mono text-[11px] text-white/70 overflow-x-auto">{JSON.stringify(detail.scope, null, 2)}</pre>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Change Diff</p>
          <div className="overflow-hidden rounded-lg border border-white/5">
            {detail.diff.map((d) => (
              <div key={d.key} className={`flex items-start gap-2 border-b border-white/5 px-3 py-2 last:border-0 ${d.changed ? "bg-white/[0.02]" : ""}`}>
                <span className="w-40 shrink-0 font-mono text-[11px] text-white/70">{d.key}</span>
                <span className="flex-1 font-mono text-[11px] text-red-300/80 line-through truncate">{fmtVal(d.before)}</span>
                <span className="w-3 text-white/30">→</span>
                <span className="flex-1 font-mono text-[11px] text-emerald-300/80 truncate">{fmtVal(d.after)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Pipeline Gates</p>
          <div className="space-y-1.5">
            {detail.gates.map((g) => (
              <div key={g.stage} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <Badge ok={g.ok} label={g.stage} />
                <div className="min-w-0 flex-1">
                  {g.detail ? <p className="text-[11px] text-white/50">{g.detail}</p> : null}
                  {g.data ? <pre className="mt-1 max-h-28 overflow-auto font-mono text-[10px] text-white/35">{JSON.stringify(g.data, null, 1)}</pre> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {detail.snapshots.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Linked Snapshots</p>
            <div className="space-y-1.5">
              {detail.snapshots.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <div>
                    <p className="text-[12px] text-white/80">{s.name}</p>
                    <p className="font-mono text-[10px] text-white/30">{s.id}</p>
                  </div>
                  <Badge ok={s.status !== "EXPIRED"} label={s.status} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {detail.restoreOrigin ? (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Restore origin</p>
            <p className="mt-1 text-[12px] text-white/70">from snapshot <span className="font-mono">{detail.restoreOrigin.name}</span> · {fmtTime(detail.restoreOrigin.createdAt)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GraphView({ graph, onClose }: { graph: CorrelationGraphResponse; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-[#0B1220] border-l border-white/10 p-6">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold">Correlation Graph</h4>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer text-lg leading-none">×</button>
        </div>
        <p className="mt-1 font-mono text-[11px] text-white/40">{graph.correlationId}</p>

        <div className="mt-4 flex flex-col gap-2">
          {graph.nodes.map((n) => (
            <div key={`${n.kind}-${n.label}`} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-[12px] font-medium text-white/80"><span className="text-white/30 uppercase text-[10px] mr-2">{n.kind}</span>{n.label}</p>
              <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] text-white/35">{JSON.stringify(n.data, null, 1)}</pre>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Edges</p>
          <div className="space-y-1">
            {graph.edges.map((e, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-[11px] text-white/50">
                <span className="text-white/70">{e.from}</span>
                <span className="text-sky-300/70">—{e.relation}→</span>
                <span className="text-white/70">{e.to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
