import React from "react";
import { useBranch } from "@/lib/branch";
import { useAccountingPeriods } from "../hooks/useFinance";
import PlatformFilterBar from "@/platform/filter/components/PlatformFilterBar";

export default function FinanceFilterBar() {
  const { branches } = useBranch();
  const { data: periodData } = useAccountingPeriods();

  const periods = periodData?.periods || [];
  const currentPeriod = periodData?.currentPeriod;

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-2">
      <PlatformFilterBar
        branches={branches}
        periods={periods}
        currentPeriod={currentPeriod}
        className="flex-wrap"
      />
    </div>
  );
}
