// ECP-020: Runtime Progress Card — shared component
// Frozen. Used by Executive page (variant="full") and Popup (variant="compact").
// Renders progress, stage, goal, owner, elapsed from ExecutionSnapshot.

import React from "react";
import { Target, Clock, ChevronDown, ChevronUp, CheckCircle2, Circle, AlertTriangle } from "lucide-react";

interface TimelineEntry {
  label: string;
  status: string;
  completedAt?: string;
  evidence?: string;
}

interface ExecutionSnapshot {
  version: number;
  executionId: string;
  timestamp: number;
  progress: { assignment: number; execution: number; overall: number };
  stage: string;
  currentGoal: { label: string; status: string } | null;
  owner: string;
  strategy: string;
  elapsedMs: number;
  timelineSummary: { completed: number; running: number; pending: number; total: number };
  metrics: {
    evidenceQuality: number;
    confidence: number;
    decisionStability: number;
    cyclesExecuted: number;
    toolDiversity: number;
    explorationDepth: number;
  };
}

interface ToolChip {
  name: string;
  status: "started" | "completed";
  durationMs?: number;
}

interface Props {
  snapshot: ExecutionSnapshot | null;
  variant: "full" | "compact";
  toolEvents?: ToolChip[];
  isComplete?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  INIT: "Memulai...",
  UNDERSTANDING: "Memahami permintaan",
  PLANNING: "Merencanakan",
  COLLECTING_EVIDENCE: "Mengumpulkan data",
  ANALYZING: "Menganalisis",
  VERIFYING: "Memverifikasi",
  REFLECTING: "Refleksi",
  COMPLETED: "Selesai",
  BLOCKED: "Terhambat",
  PAUSED: "Ditunda",
};

const STRATEGY_LABELS: Record<string, string> = {
  EXPLORE: "Eksplorasi",
  ANALYZE: "Analisis",
  CONCLUDE: "Kesimpulan",
  EXECUTE: "Eksekusi",
  ESCALATE: "Eskalasi",
};

export function RuntimeProgressCard({ snapshot, variant, toolEvents, isComplete }: Props) {
  const [showDetail, setShowDetail] = React.useState(false);

  if (!snapshot) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Memproses...
      </div>
    );
  }

  const stageLabel = STAGE_LABELS[snapshot.stage] || snapshot.stage;
  const strategyLabel = STRATEGY_LABELS[snapshot.strategy] || snapshot.strategy;
  const elapsed = Math.round(snapshot.elapsedMs / 1000);
  const isFull = variant === "full";

  // Auto-collapse when complete
  const collapsed = isComplete === true;
  if (collapsed && variant === "compact") return null;

  return (
    <div className={`rounded-xl border transition-all ${
      collapsed ? "opacity-0 max-h-0 overflow-hidden p-0 border-0" :
      isFull
        ? "border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 mb-3"
        : "border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 mb-2"
    }`}>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex-1 h-1.5 rounded-full ${isFull ? "" : "h-1"} bg-blue-100 dark:bg-blue-900 overflow-hidden`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              snapshot.progress.overall >= 90 ? "bg-green-400" :
              snapshot.progress.overall >= 50 ? "bg-blue-400" :
              "bg-blue-300"
            }`}
            style={{ width: `${snapshot.progress.overall}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 w-8 text-right">
          {snapshot.progress.overall}%
        </span>
      </div>

      {/* Stage + Strategy */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-medium text-blue-700 dark:text-blue-300">
          {stageLabel}
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{strategyLabel}</span>
        {isFull && snapshot.currentGoal && (
          <>
            <span className="text-slate-400">·</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Target size={10} />
              {snapshot.currentGoal.label}
            </span>
          </>
        )}
        <span className="text-slate-400">·</span>
        <span className="flex items-center gap-1 text-slate-500">
          <Clock size={10} />
          {elapsed}s
        </span>
      </div>

      {/* Full variant: Owner + Goals */}
      {isFull && (
        <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
          <span>Owner: <span className="text-slate-700 dark:text-slate-300 font-medium">{snapshot.owner}</span></span>
          <span>
            Goals: {snapshot.timelineSummary.completed}/{snapshot.timelineSummary.total}
            {snapshot.timelineSummary.running > 0 && (
              <span className="text-blue-500 ml-1">(+{snapshot.timelineSummary.running})</span>
            )}
          </span>
        </div>
      )}

      {/* Technical Detail (expandable, full variant only) */}
      {isFull && toolEvents && toolEvents.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showDetail ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            Technical Detail
          </button>
          {showDetail && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {toolEvents.slice(-8).map((t, i) => (
                <span key={i} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${
                  t.status === "completed" ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" :
                  "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                }`}>
                  {t.status === "completed" ? "✓" : "⟳"} {t.name}{t.durationMs ? ` ${t.durationMs}ms` : ""}
                </span>
              ))}
              <div className="w-full mt-1 text-[9px] text-slate-400 flex gap-3">
                <span>Evidence: {Math.round(snapshot.metrics.evidenceQuality * 100)}%</span>
                <span>Confidence: {snapshot.metrics.confidence}%</span>
                <span>Cycles: {snapshot.metrics.cyclesExecuted}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
