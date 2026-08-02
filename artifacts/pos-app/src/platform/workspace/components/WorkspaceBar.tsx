import React, { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import type { DatePreset, ExecutiveRole, WorkspaceScenario } from "../WorkspaceTypes";
import { ChevronDown, RefreshCw, Building2, Calendar, Globe, LayoutGrid } from "lucide-react";

export type WorkspaceBarMode = "full" | "compact" | "minimal" | "floating";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "last7", label: "7 Hari" },
  { value: "last30", label: "30 Hari" },
  { value: "thisMonth", label: "Bulan Ini" },
  { value: "lastMonth", label: "Bulan Lalu" },
  { value: "custom", label: "Custom" },
];

const EXECUTIVE_ROLES: { value: ExecutiveRole; label: string; icon: string }[] = [
  { value: "ceo", label: "CEO", icon: "👔" },
  { value: "cfo", label: "CFO", icon: "💰" },
  { value: "coo", label: "COO", icon: "⚙️" },
  { value: "cto", label: "CTO", icon: "💻" },
  { value: "cmo", label: "CMO", icon: "📊" },
  { value: "chro", label: "CHRO", icon: "👥" },
  { value: "cko", label: "CKO", icon: "🧠" },
  { value: "caio", label: "CAIO", icon: "🤖" },
];

const SCENARIOS: { value: WorkspaceScenario; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "forecast", label: "Forecast" },
  { value: "simulation", label: "Simulasi" },
  { value: "historical", label: "Historis" },
];

interface WorkspaceBarPeriod {
  id: number;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface WorkspaceBarProps {
  mode?: WorkspaceBarMode;
  branches?: { id: number; name: string }[];
  periods?: WorkspaceBarPeriod[];
  currentPeriod?: WorkspaceBarPeriod | null;
  showBranch?: boolean;
  showDate?: boolean;
  showPeriod?: boolean;
  showRuntime?: boolean;
  showScenario?: boolean;
  showRefresh?: boolean;
  className?: string;
}

export default function WorkspaceBar({
  mode = "full",
  branches = [],
  periods = [],
  currentPeriod = null,
  showBranch = true,
  showDate = true,
  showPeriod = true,
  showRuntime = true,
  showScenario = true,
  showRefresh = true,
  className = "",
}: WorkspaceBarProps) {
  const {
    state, setBranches, setDatePreset, setCustomDates,
    setAccountingPeriod, setExecutiveRuntime, setScenario,
    refresh,
  } = useWorkspace();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toDateStr = (d?: string) => (d ? d.slice(0, 10) : undefined);

  const selectPeriod = (p?: WorkspaceBarPeriod | null) => {
    if (p?.id) setAccountingPeriod(p.id);
    else setAccountingPeriod(null);
    const s = toDateStr(p?.startDate);
    const e = toDateStr(p?.endDate);
    if (s && e) setCustomDates(s, e);
    close();
  };

  const toggleBranch = (id: number) => {
    const next = state.branchIds.includes(id)
      ? state.branchIds.filter((b) => b !== id)
      : [...state.branchIds, id];
    setBranches(next.length === branches.length ? [] : next);
  };

  const close = () => setOpenMenu(null);
  const toggle = (name: string) => setOpenMenu(openMenu === name ? null : name);

  const isCompact = mode === "compact" || mode === "minimal";

  const PillButton = ({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
        active ? "bg-primary/10 border-primary/30 text-primary" : "border-border hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className={`flex items-center gap-2 overflow-visible flex-wrap ${className}`}>
      {/* Executive Runtime */}
      {showRuntime && (
        <div className="relative shrink-0">
          <PillButton onClick={() => toggle("runtime")} active={openMenu === "runtime"}>
            {EXECUTIVE_ROLES.find((r) => r.value === state.executiveRuntime)?.icon}{" "}
            {EXECUTIVE_ROLES.find((r) => r.value === state.executiveRuntime)?.label}
            <ChevronDown className="w-3 h-3" />
          </PillButton>
          {openMenu === "runtime" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 min-w-[140px] z-50">
                {EXECUTIVE_ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => { setExecutiveRuntime(r.value); close(); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                      state.executiveRuntime === r.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Scenario */}
      {showScenario && (
        <div className="relative shrink-0">
          <PillButton onClick={() => toggle("scenario")} active={openMenu === "scenario"}>
            <LayoutGrid className="w-3 h-3" />
            {SCENARIOS.find((s) => s.value === state.scenario)?.label}
            <ChevronDown className="w-3 h-3" />
          </PillButton>
          {openMenu === "scenario" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setScenario(s.value); close(); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                      state.scenario === s.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Branch */}
      {showBranch && (
        <div className="relative shrink-0">
          <PillButton onClick={() => toggle("branch")} active={openMenu === "branch"}>
            <Building2 className="w-3 h-3" />
            {state.branchIds.length > 0 && state.branchIds.length < branches.length
              ? `${state.branchIds.length} Cabang`
              : state.branchIds.length === 0
              ? "Semua Cabang"
              : "Cabang"}
            {state.branchIds.length > 0 && state.branchIds.length < branches.length && (
              <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">
                {state.branchIds.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </PillButton>
          {openMenu === "branch" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 min-w-[180px] z-50">
                <button
                  onClick={() => { setBranches([]); close(); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                    state.branchIds.length === 0 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                  }`}
                >
                  Semua Cabang
                </button>
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => toggleBranch(b.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                      state.branchIds.includes(b.id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${
                      state.branchIds.includes(b.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {state.branchIds.includes(b.id) && <span className="text-white text-[8px]">✓</span>}
                    </span>
                    {b.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Date */}
      {showDate && (
        <div className="relative shrink-0">
          <PillButton onClick={() => toggle("date")} active={openMenu === "date"}>
            <Calendar className="w-3 h-3" />
            {DATE_PRESETS.find((p) => p.value === state.datePreset)?.label || "Tanggal"}
            <ChevronDown className="w-3 h-3" />
          </PillButton>
          {openMenu === "date" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => { setDatePreset(p.value); close(); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                      state.datePreset === p.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {state.datePreset === "custom" && (
                  <div className="px-2 pt-2 pb-1 space-y-1 border-t border-border mt-1">
                    <input type="date" value={state.startDate || ""} onChange={(e) => setCustomDates(e.target.value, state.endDate || "")}
                      className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background" />
                    <input type="date" value={state.endDate || ""} onChange={(e) => setCustomDates(state.startDate || "", e.target.value)}
                      className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background" />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Accounting Period */}
      {showPeriod && periods.length > 0 && (
        <div className="relative shrink-0">
          <PillButton onClick={() => toggle("period")} active={openMenu === "period"}>
            <Globe className="w-3 h-3" />
            {state.accountingPeriodId
              ? periods.find((p) => p.id === state.accountingPeriodId)?.name || "Periode"
              : currentPeriod?.name || "Periode"}
            <ChevronDown className="w-3 h-3" />
          </PillButton>
          {openMenu === "period" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
                <button onClick={() => selectPeriod(currentPeriod)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${
                    state.accountingPeriodId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                  }`}>
                  Current (Open)
                </button>
                {periods.map((p) => (
                  <button key={p.id} onClick={() => selectPeriod(p)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                      state.accountingPeriodId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                    }`}>
                    {p.name}
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                      p.status === "OPEN" ? "bg-green-500/10 text-green-600" :
                      p.status === "CLOSED" ? "bg-red-500/10 text-red-600" : "bg-yellow-500/10 text-yellow-600"
                    }`}>{p.status}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Summary line */}
      {!isCompact && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
          {state.executiveRuntime.toUpperCase()}
          {" · "}
          {state.scenario}
          {" · "}
          {state.branchIds.length > 0 ? `${state.branchIds.length} cabang` : "Semua cabang"}
          {" · "}
          {state.startDate === state.endDate ? state.startDate : `${state.startDate} ~ ${state.endDate}`}
        </span>
      )}

      {/* Refresh */}
      {showRefresh && (
        <button onClick={() => refresh()}
          className="w-8 h-8 flex items-center justify-center text-xs rounded-lg border border-border hover:bg-muted/50 transition-colors shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
