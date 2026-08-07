// SnapshotManager — list / search / compare / restore configuration snapshots.
// Snapshots are captured server-side from the committed store; restore is a
// pipeline commit (new revision) — this UI only calls the REST API.

import { useEffect, useState } from "react";
import { Search, RotateCcw, Save } from "lucide-react";
import { settingsApi, type ConfigSnapshot } from "../api";
import { DiffTable } from "./GovernancePanels";

export default function SnapshotManager() {
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ConfigSnapshot | null>(null);
  const [compareWith, setCompareWith] = useState<string | null>(null);
  const [diff, setDiff] = useState<Array<{ key: string; a: unknown; b: unknown; changed: boolean }> | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.snapshots();
      setSnapshots(data.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = snapshots.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  const select = (s: ConfigSnapshot) => {
    setSelected(s);
    setDiff(null);
    setCompareWith(null);
  };

  const runCompare = async () => {
    if (!selected || !compareWith) return;
    const a = snapshots.find((s) => s.id === selected.id);
    const b = snapshots.find((s) => s.id === compareWith);
    if (!a || !b) return;
    const keys = new Set([...Object.keys(a.changes), ...Object.keys(b.changes)]);
    const rows = [...keys].map((key) => ({ key, a: a.changes[key], b: b.changes[key], changed: JSON.stringify(a.changes[key]) !== JSON.stringify(b.changes[key]) }));
    setDiff(rows);
  };

  const restore = async (id: string) => {
    try {
      await settingsApi.restore(id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const captureNow = async () => {
    try {
      await settingsApi.preview({ scope: { type: "workspace", workspaceId: 1 }, changes: {} });
      // Snapshot capture is server-side only; rely on list refresh after a commit.
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="flex h-full bg-[#0B1220] text-white">
      <aside className="w-72 shrink-0 border-r border-white/5 flex flex-col">
        <div className="p-3 border-b border-white/5 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snapshots…"
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-8 pr-3 py-2 text-[12px] text-white/80 placeholder:text-white/30 outline-none focus:border-white/25"
            />
          </div>
          <button onClick={captureNow} className="w-full flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/70 hover:bg-white/15 cursor-pointer">
            <Save className="h-3 w-3" /> Capture current state
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => select(s)}
              className={`w-full rounded-lg px-3 py-2 text-left transition cursor-pointer ${
                selected?.id === s.id ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/[0.03]"
              }`}
            >
              <p className="text-[12px] font-medium truncate">{s.name}</p>
              <p className="text-[10px] text-white/30">rev {s.revision} · {s.actor} · {new Date(s.createdAt).toLocaleString()}</p>
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-[11px] text-white/30">No snapshots.</p>}
        </nav>
      </aside>

      <section className="flex-1 min-w-0 overflow-y-auto p-6">
        {loading ? (
          <div className="text-sm text-white/40 animate-pulse">Loading snapshots…</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : selected ? (
          <div className="space-y-4 max-w-3xl">
            <header className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <p className="text-[12px] text-white/40">
                  Captured at rev {selected.revision} by {selected.actor} on {new Date(selected.createdAt).toLocaleString()} · scope {selected.scope.type}
                </p>
              </div>
              <button onClick={() => restore(selected.id)} className="flex items-center gap-1 rounded-lg bg-amber-500/90 px-3 py-2 text-[12px] font-semibold text-white hover:bg-amber-500 cursor-pointer">
                <RotateCcw className="h-3 w-3" /> Restore via Pipeline
              </button>
            </header>

            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Compare with</h4>
              <div className="flex gap-2">
                <select
                  value={compareWith ?? ""}
                  onChange={(e) => setCompareWith(e.target.value || null)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/80"
                >
                  <option value="">— select snapshot —</option>
                  {snapshots.filter((s) => s.id !== selected.id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (rev {s.revision})</option>
                  ))}
                </select>
                <button onClick={runCompare} disabled={!compareWith} className="rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/70 hover:bg-white/15 disabled:opacity-40 cursor-pointer">Compare</button>
              </div>
              {diff && <div className="mt-2"><DiffTable before={Object.fromEntries(diff.map((d) => [d.key, d.a]))} after={Object.fromEntries(diff.map((d) => [d.key, d.b]))} /></div>}
            </div>

            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">Snapshot Contents</h4>
              <DiffTable before={{}} after={selected.changes} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/40">Select a snapshot to inspect it.</div>
        )}
      </section>
    </div>
  );
}
