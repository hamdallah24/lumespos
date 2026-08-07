// PackagesPanel — list + install configuration packages (metadata-defined).
// Install goes through the pipeline on the server (creates a new revision).

import { useEffect, useState } from "react";
import { Download, Package } from "lucide-react";
import { settingsApi, type ConfigPackage } from "../api";

export default function PackagesPanel() {
  const [packages, setPackages] = useState<ConfigPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.packages();
      setPackages(data.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const install = async (pkg: ConfigPackage) => {
    setError(null);
    setResult(null);
    try {
      const res = await settingsApi.installPackage(pkg.id, { scope: pkg.scope });
      setResult(`Installed "${pkg.name}" → revision ${res.revision ?? "n/a"}, keys: ${res.applied.join(", ")}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="h-full bg-[#0B1220] text-white overflow-y-auto p-6">
      {loading ? (
        <div className="text-sm text-white/40 animate-pulse">Loading packages…</div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {error && <div className="text-sm text-red-400">{error}</div>}
          {result && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">{result}</div>}
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-start justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4 text-white/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/85">{pkg.name} <span className="text-[10px] text-white/30">v{pkg.version}</span></p>
                  {pkg.description && <p className="text-[12px] text-white/50">{pkg.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.keys(pkg.changes).map((k) => (
                      <span key={k} className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/50">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => install(pkg)} className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/80 hover:bg-white/15 cursor-pointer shrink-0">
                <Download className="h-3 w-3" /> Install
              </button>
            </div>
          ))}
          {packages.length === 0 && <div className="text-sm text-white/40">No packages registered.</div>}
        </div>
      )}
    </div>
  );
}