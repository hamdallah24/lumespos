import React, { useEffect } from "react";
import { useBranch } from "@/lib/branch";
import { useAccountingPeriods } from "../hooks/useFinance";
import { useWorkspace } from "@/platform/workspace/hooks/useWorkspace";
import WorkspaceBar from "@/platform/workspace/components/WorkspaceBar";

export default function FinanceFilterBar() {
  const { branches } = useBranch();
  const { state, setAccountingPeriod } = useWorkspace();
  const { data: periodData } = useAccountingPeriods();

  const periods = periodData?.periods || [];
  const currentPeriod = periodData?.currentPeriod;

  useEffect(() => {
    if (!periodData || periods.length === 0) return;
    const selected = state.accountingPeriodId
      ? periods.find((p: { id: number }) => p.id === state.accountingPeriodId)
      : null;
    if (selected && selected.status === "CLOSED") {
      setAccountingPeriod(null);
    }
  }, [periodData, periods, state.accountingPeriodId, setAccountingPeriod]);

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
      <WorkspaceBar
        branches={branches}
        periods={periods}
        currentPeriod={currentPeriod}
        className="flex-wrap"
      />
    </div>
  );
}
