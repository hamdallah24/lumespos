import React, { useState } from "react";
import { useFinanceFilter, type DatePreset } from "../context/FinanceFilterContext";
import { useBranch } from "@/lib/branch";
import { useAccountingPeriods } from "../hooks/useFinance";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "last7", label: "7 Hari" },
  { value: "last30", label: "30 Hari" },
  { value: "thisMonth", label: "Bulan Ini" },
  { value: "lastMonth", label: "Bulan Lalu" },
  { value: "custom", label: "Custom" },
];

export default function FinanceFilterBar() {
  const { state, setBranches, setDatePreset, setCustomDates, setAccountingPeriod } = useFinanceFilter();
  const { branches } = useBranch();
  const { data: periodData } = useAccountingPeriods();
  const queryClient = useQueryClient();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const periods = periodData?.periods || [];
  const currentPeriod = periodData?.currentPeriod;

  const toggleBranch = (id: number) => {
    const next = state.branchIds.includes(id)
      ? state.branchIds.filter(b => b !== id)
      : [...state.branchIds, id];
    setBranches(next.length === branches.length ? [] : next);
  };

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["finance"] });
  };

  const close = () => setOpenMenu(null);
  const toggle = (name: string) => setOpenMenu(openMenu === name ? null : name);

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border -mx-4 px-4 py-2 flex items-center gap-2 overflow-visible">
      {/* Branch Filter */}
      <div className="relative shrink-0">
        <button onClick={() => toggle("branch")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors whitespace-nowrap">
          Cabang <ChevronDown className="w-3 h-3" />
          {state.branchIds.length > 0 && state.branchIds.length < branches.length && (
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">{state.branchIds.length}</span>
          )}
        </button>
        {openMenu === "branch" && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 min-w-[180px] z-50">
              <button onClick={() => { setBranches([]); close(); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${state.branchIds.length === 0 ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}>
                Semua Cabang
              </button>
              {branches.map(b => (
                <button key={b.id} onClick={() => toggleBranch(b.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${state.branchIds.includes(b.id) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                  <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${state.branchIds.includes(b.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {state.branchIds.includes(b.id) && <span className="text-white text-[8px]">✓</span>}
                  </span>
                  {b.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Date Preset Filter */}
      <div className="relative shrink-0">
        <button onClick={() => toggle("date")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors whitespace-nowrap">
          {DATE_PRESETS.find(p => p.value === state.datePreset)?.label || "Tanggal"} <ChevronDown className="w-3 h-3" />
        </button>
        {openMenu === "date" && (
          <>
            <div className="fixed inset-0 z-40" onClick={close} />
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
              {DATE_PRESETS.map(p => (
                <button key={p.value} onClick={() => { setDatePreset(p.value); close(); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${state.datePreset === p.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}>
                  {p.label}
                </button>
              ))}
              {state.datePreset === "custom" && (
                <div className="px-2 pt-2 pb-1 space-y-1 border-t border-border mt-1">
                  <input type="date" value={state.startDate || ""} onChange={e => setCustomDates(e.target.value, state.endDate || "")}
                    className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background" />
                  <input type="date" value={state.endDate || ""} onChange={e => setCustomDates(state.startDate || "", e.target.value)}
                    className="w-full text-xs border border-border rounded-md px-2 py-1 bg-background" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Accounting Period */}
      {periods.length > 0 && (
        <div className="relative shrink-0">
          <button onClick={() => toggle("period")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors whitespace-nowrap">
            {state.accountingPeriodId
              ? periods.find((p: any) => p.id === state.accountingPeriodId)?.name || "Periode"
              : currentPeriod?.name || "Periode"}
            <ChevronDown className="w-3 h-3" />
          </button>
          {openMenu === "period" && (
            <>
              <div className="fixed inset-0 z-40" onClick={close} />
              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
                <button onClick={() => { setAccountingPeriod(null); close(); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs ${state.accountingPeriodId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}>
                  Current (Open)
                </button>
                {periods.map((p: any) => (
                  <button key={p.id} onClick={() => { setAccountingPeriod(p.id); close(); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${state.accountingPeriodId === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                    {p.name}
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${p.status === "OPEN" ? "bg-green-500/10 text-green-600" : p.status === "CLOSED" ? "bg-red-500/10 text-red-600" : "bg-yellow-500/10 text-yellow-600"}`}>
                      {p.status}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:inline">
        {state.branchIds.length > 0 ? `${state.branchIds.length} cabang` : "Semua cabang"}
        {" · "}
        {state.startDate === state.endDate ? state.startDate : `${state.startDate} ~ ${state.endDate}`}
      </span>

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={refreshAll}>
        <RefreshCw className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
