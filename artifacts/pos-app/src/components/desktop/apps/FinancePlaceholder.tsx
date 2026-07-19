import { TrendingUp } from "lucide-react";

export default function FinancePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <TrendingUp className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white/90">Finance</h2>
        <p className="text-sm text-white/40 mt-1 max-w-xs">
          Financial management, reports, P&L, balance sheet, cash flow.
        </p>
      </div>
    </div>
  );
}
