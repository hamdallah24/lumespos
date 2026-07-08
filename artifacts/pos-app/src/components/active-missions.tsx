import React from "react";
import { Target, Clock, Play, CheckCircle2, XCircle, ChevronRight } from "lucide-react";

interface Mission {
  id: number;
  title: string;
  objective: string;
  mode: string;
  status: string;
  complexity: string;
  strategy: string | null;
  progress: number;
  evidenceQuality: number;
  confidence: number;
  cyclesExecuted: number;
  currentGoal: string | null;
  result: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-yellow-500" />,
  running: <Play size={14} className="text-blue-500 animate-pulse" />,
  completed: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", running: "Berjalan", completed: "Selesai", failed: "Gagal",
};

const STRATEGY_LABEL: Record<string, string> = {
  EXPLORE: "Eksplorasi", ANALYZE: "Analisis", CONCLUDE: "Kesimpulan", EXECUTE: "Eksekusi",
};

export function ActiveMissions({ onSelect }: { onSelect: (id: number) => void }) {
  const [missions, setMissions] = React.useState<Mission[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchMissions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/ai/missions/active", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions || []);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  React.useEffect(() => { fetchMissions(); const iv = setInterval(fetchMissions, 8000); return () => clearInterval(iv); }, [fetchMissions]);

  if (loading) return <div className="text-xs text-slate-400 px-3 py-2">Memuat misi...</div>;
  if (missions.length === 0) return null;

  return (
    <div className="space-y-1 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        <Target size={12} /> Misi Aktif ({missions.length})
      </div>
      {missions.map(m => (
        <button key={m.id} onClick={() => onSelect(m.id)}
          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors group"
        >
          {STATUS_ICON[m.status] || <Clock size={14} className="text-slate-400" />}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{m.title}</div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>{STATUS_LABEL[m.status] || m.status}</span>
              {m.strategy && <span>· {STRATEGY_LABEL[m.strategy] || m.strategy}</span>}
              {m.status === "running" && <span>· {m.progress}%</span>}
            </div>
          </div>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
        </button>
      ))}
    </div>
  );
}
