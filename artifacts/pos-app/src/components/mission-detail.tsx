import React from "react";
import { X, Target, Clock, Play, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

interface Snapshot {
  id: number;
  missionId: number;
  cycle: number;
  strategy: string | null;
  stage: string | null;
  progress: number;
  currentGoal: string | null;
  toolCalls: any[] | null;
  evidenceQuality: number | null;
  confidence: number | null;
  metrics: any | null;
  createdAt: string;
}

const STRATEGY_COLOR: Record<string, string> = {
  EXPLORE: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ANALYZE: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  CONCLUDE: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  EXECUTE: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export function MissionDetail({ missionId, onClose }: { missionId: number; onClose: () => void }) {
  const [mission, setMission] = React.useState<any>(null);
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const eventLogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!missionId) return;
    // Fetch mission + subscribe SSE
    const es = new EventSource(`/api/ai/mission/${missionId}/stream`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "snapshot") {
          setSnapshots(prev => {
            if (prev.some(s => s.cycle === d.cycle && s.strategy === d.strategy)) return prev;
            setEvents(ev => [...ev.slice(-49), { time: new Date().toLocaleTimeString(), text: `${d.strategy || "?"} cycle ${d.cycle} — ${d.stage || "progress " + d.progress + "%"}` }]);
            return [...prev, d];
          });
        } else if (d.type === "status_change") {
          setMission((prev: any) => prev ? { ...prev, status: d.status, ...d.data } : prev);
          setEvents(ev => [...ev.slice(-49), { time: new Date().toLocaleTimeString(), text: `Status → ${d.status}` }]);
        } else if (d.type === "mission") {
          setMission(d);
          setEvents(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), text: `Misi #${d.id}: ${d.status} (${d.progress}%)` }]);
        }
      } catch {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [missionId]);

  React.useEffect(() => { eventLogRef.current?.scrollTo({ top: eventLogRef.current.scrollHeight, behavior: "smooth" }); }, [events]);

  if (!mission) return (
    <div className="flex items-center justify-center py-20 text-sm text-slate-400">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2" /> Memuat misi...
    </div>
  );

  const lastSnapshot = snapshots[snapshots.length - 1];
  const progress = mission.progress || lastSnapshot?.progress || 0;
  const strategy = mission.strategy || lastSnapshot?.strategy || "";
  const isRunning = mission.status === "running";
  const isDone = mission.status === "completed" || mission.status === "failed";

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-10 sm:pt-20" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-base truncate max-w-md">{mission.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>Misi #{mission.id}</span>
              <span>·</span>
              <span className={isRunning ? "text-blue-500 font-medium" : ""}>{mission.status}</span>
              {mission.complexity && <><span>·</span><span>{mission.complexity}</span></>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium">Progress</span>
              <span className="text-xs font-mono text-blue-600">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-green-400" : "bg-blue-400"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="text-[10px] text-slate-500 uppercase">Evidence</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{mission.evidenceQuality || lastSnapshot?.evidenceQuality || 0}%</div>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
              <div className="text-[10px] text-slate-500 uppercase">Confidence</div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{mission.confidence || lastSnapshot?.confidence || 0}%</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="text-[10px] text-slate-500 uppercase">Cycles</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-300">{mission.cyclesExecuted || snapshots.length || 0}</div>
            </div>
          </div>

          {/* Strategy + Current Goal */}
          {strategy && (
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${STRATEGY_COLOR[strategy] || "bg-slate-100 text-slate-600"}`}>
                {strategy}
              </span>
              {mission.currentGoal && (
                <span className="text-xs text-slate-500 truncate">{mission.currentGoal}</span>
              )}
            </div>
          )}

          {/* Event Log */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <Activity size={12} /> Activity Log
            </div>
            <div ref={eventLogRef} className="h-40 overflow-y-auto space-y-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3">
              {events.length === 0 ? (
                <div className="text-slate-400 italic">Menunggu aktivitas...</div>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-400 shrink-0">{ev.time}</span>
                    <span className="text-slate-700 dark:text-slate-300">{ev.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Result */}
          {mission.result && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                <CheckCircle2 size={12} /> Hasil
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                {mission.result?.slice(0, 4000)}
              </div>
            </div>
          )}

          {/* Error */}
          {mission.error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle size={14} className="inline mr-1" /> {mission.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
