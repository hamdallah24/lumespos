// SettingsShell — metadata-driven configuration workspace (pos-app).
// Navigation, category, search, filtering, grouping all come from the Registry
// catalog (via /api/v1/settings). Fields are rendered by ConfigFieldFactory.
// Edits flow through pipeline.plan() panels before any commit.

import { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, Save, Activity } from "lucide-react";
import { settingsApi, type CatalogResponse, type ConfigFieldMeta, type ConfigScope, type ConfigValue } from "./api";
import ConfigFieldFactory from "./components/ConfigFieldFactory";
import ResolvedConfigurationViewer from "./components/ResolvedConfigurationViewer";
import GovernancePanels, { type GovernanceResult } from "./components/GovernancePanels";

interface DraftValue {
  raw: ConfigValue;
  dirty: boolean;
}

const DEFAULT_SCOPE: ConfigScope = { type: "workspace", workspaceId: 1 };

export default function SettingsShell() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, ConfigValue>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftValue>>({});
  const [scope, setScope] = useState<ConfigScope>(DEFAULT_SCOPE);
  const [governance, setGovernance] = useState<GovernanceResult>({ preview: null, simulation: null, impact: null, policy: null, loading: false, error: null });
  const [traceKey, setTraceKey] = useState<string | null>(null);
  const [trace, setTrace] = useState<Parameters<typeof ResolvedConfigurationViewer>[0]["trace"]>([]);
  const [traceLoading, setTraceLoading] = useState(false);

  const hasDirty = Object.values(drafts).some((d) => d.dirty);

  const load = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.list(q ? { search: q } : undefined);
      setCatalog(data);
      if (!data.groups[0]) throw new Error("Registry returned no groups");
      setActiveGroup((prev) => prev ?? data.groups[0].id);
      return data;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    return null;
  };

  useEffect(() => {
    void load();
  }, []);

  // Debounced search re-query.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search) void load(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const groups = catalog?.groups ?? [];
  const activeGroupObj = groups.find((g) => g.id === activeGroup) ?? groups[0];

  const dirtyChanges = useMemo(() => {
    const changes: Record<string, ConfigValue> = {};
    for (const [key, d] of Object.entries(drafts)) {
      if (d.dirty) changes[key] = d.raw;
    }
    return changes;
  }, [drafts]);

  const setFieldValue = (field: ConfigFieldMeta, value: ConfigValue) => {
    setDrafts((prev) => ({ ...prev, [field.key]: { raw: value, dirty: true } }));
  };

  // Run all governance panels for the current dirty changes (plan endpoints never commit).
  const runGovernance = async () => {
    const body = { scope, changes: dirtyChanges };
    setGovernance({ preview: null, simulation: null, impact: null, policy: null, loading: true, error: null });
    try {
      const [preview, simulation, impact, policy] = await Promise.all([
        settingsApi.preview(body),
        settingsApi.simulate(body),
        settingsApi.impact(body),
        settingsApi.policyCheck(body),
      ]);
      setGovernance({ preview, simulation: simulation.items, impact, policy, loading: false, error: null });
    } catch (err) {
      setGovernance({ preview: null, simulation: null, impact: null, policy: null, loading: false, error: (err as Error).message });
    }
  };

  // Commit only after governance panels are loaded and policy allows.
  const commit = async () => {
    if (!governance.policy?.ok) {
      setError("Cannot commit: policy gate prevents this change at the selected scope.");
      return;
    }
    const key = Object.keys(dirtyChanges)[0];
    if (!key) {
      setError("No dirty changes to commit.");
      return;
    }
    try {
      const res = await settingsApi.update(key, { scope, value: dirtyChanges[key] });
      setDrafts({});
      setGovernance({ preview: null, simulation: null, impact: null, policy: null, loading: false, error: null });
      setError(null);
      await settingsApi.resolved().then(setResolved);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const showTrace = async (key: string) => {
    setTraceKey(key);
    setTraceLoading(true);
    try {
      setTrace(await settingsApi.trace(key));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTraceLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-[#0B1220] text-white">
      {/* Sidebar: categories + search */}
      <aside className="w-56 shrink-0 border-r border-white/5 flex flex-col">
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search config…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-3 py-2 text-[12px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/25"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[12px] transition cursor-pointer ${
                activeGroupObj?.id === g.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.03] hover:text-white/60"
              }`}
            >
              <span className="capitalize font-medium">{g.title}</span>
              <span className="text-[10px] text-white/20">{g.fields.length}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <section className="flex-1 min-w-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-white/40 animate-pulse">Loading registry…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-400">{error}</div>
        ) : activeGroupObj ? (
          <div className="p-6 space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-white/90 capitalize">{activeGroupObj.title}</h3>
              <p className="text-[12px] text-white/40">{activeGroupObj.fields.length} field(s) from Registry · checksum {catalog?.checksum.slice(0, 8)}</p>
            </header>

            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span>Scope:</span>
              <select value={scope.type} onChange={(e) => setScope({ type: e.target.value as ConfigScope["type"], workspaceId: 1 })} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white/80">
                {["workspace", "branch", "executive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Field cards */}
            <div className="space-y-3">
              {activeGroupObj.fields.map((field) => {
                const current = draftValue(field, drafts, resolved);
                const dirty = drafts[field.key]?.dirty;
                return (
                  <div key={field.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white/85">{field.title}</p>
                        <p className="font-mono text-[11px] text-white/30">{field.key}</p>
                        {field.description && <p className="mt-1 text-[12px] text-white/50">{field.description}</p>}
                      </div>
                      {dirty && (
                        <button
                          onClick={() => setDrafts((prev) => { const n = { ...prev }; delete n[field.key]; return n; })}
                          className="text-[11px] text-red-400/80 hover:text-red-400 cursor-pointer whitespace-nowrap"
                        >
                          Revert
                        </button>
                      )}
                    </div>
                    <div className="mt-3 max-w-xl">
                      <ConfigFieldFactory field={field} value={current} onChange={(v) => setFieldValue(field, v)} disabled={Boolean(field.immutable)} />
                    </div>
                    {dirty && (
                      <button onClick={() => showTrace(field.key)} className="mt-2 flex items-center gap-1 text-[11px] text-sky-400/80 hover:text-sky-400 cursor-pointer">
                        <Activity className="h-3 w-3" /> View resolution trace
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Trace viewer */}
            {traceKey && (
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-sky-300/90 uppercase tracking-wider">Resolution Trace — {traceKey}</h4>
                  <button onClick={() => { setTraceKey(null); setTrace([]); }} className="text-[11px] text-white/40 hover:text-white/70 cursor-pointer">Close</button>
                </div>
                <ResolvedConfigurationViewer key={traceKey} trace={trace} loading={traceLoading} />
              </div>
            )}

            {/* Governance panels + commit */}
            {hasDirty && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Governance Preview</h4>
                  <button onClick={runGovernance} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/15 cursor-pointer">
                    <Activity className="h-3 w-3" /> Run Preview
                  </button>
                </div>
                <GovernancePanels result={governance} scope={scope} />
                <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                  <button onClick={() => { setDrafts({}); setGovernance({ preview: null, simulation: null, impact: null, policy: null, loading: false, error: null }); }} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[12px] text-white/60 hover:text-white/80 cursor-pointer">
                    <RotateCcw className="h-3 w-3" /> Discard
                  </button>
                  <button
                    onClick={commit}
                    disabled={!governance.preview && !governance.loading}
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/90 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Save className="h-3 w-3" /> Commit (creates revision)
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function draftValue(field: ConfigFieldMeta, drafts: Record<string, DraftValue>, resolved: Record<string, ConfigValue>): ConfigValue {
  if (drafts[field.key]?.dirty) return drafts[field.key].raw;
  if (field.key in resolved) return resolved[field.key];
  return field.defaultValue;
}
