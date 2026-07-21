import React from "react";
import { useBranch } from "@/lib/branch";
import { useAccountingPeriods } from "../hooks/useFinance";
import WorkspaceBar from "@/platform/workspace/components/WorkspaceBar";

export default function FinanceFilterBar() {
  const { branches } = useBranch();
  const { data: periodData } = useAccountingPeriods();

  const periods = periodData?.periods || [];
  const currentPeriod = periodData?.currentPeriod;

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
