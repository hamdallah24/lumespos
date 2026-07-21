import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import { usePlatformFilter } from "@/platform/filter";
import { formatIDR, type CashflowRange, type CashflowPoint } from "@/lib/home/home-data";

const RANGE_LABELS: Record<CashflowRange, string> = {
  day: "Hari",
  week: "Minggu",
  month: "Bulan",
  year: "Tahun",
};

const RANGES: CashflowRange[] = ["day", "week", "month", "year"];

function getDateRange(range: CashflowRange): { start: Date; end: Date; labels: string[] } {
  const end = new Date();
  const start = new Date();
  const labels: string[] = [];

  switch (range) {
    case "day":
      start.setHours(0, 0, 0, 0);
      for (let h = 8; h <= 18; h += 2) {
        labels.push(`${h.toString().padStart(2, "0")}:00`);
      }
      break;
    case "week":
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        labels.push(dayNames[d.getDay()]);
      }
      break;
    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      const weeksInMonth = Math.ceil((end.getDate()) / 7);
      for (let w = 0; w < weeksInMonth; w++) {
        labels.push(`M${w + 1}`);
      }
      break;
    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      const shortMonths = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      for (let m = 0; m < 12; m++) {
        labels.push(shortMonths[m]);
      }
      break;
  }

  return { start, end, labels };
}

async function fetchCashflowData(range: CashflowRange, branchIds?: number[]): Promise<CashflowPoint[]> {
  try {
    const { start, end, labels } = getDateRange(range);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const branchParam = branchIds && branchIds.length > 0 ? `&branchIds=${branchIds.join(",")}` : "";

    const res = await fetch(
      `/api/finance/timeline?startDate=${startDate}&endDate=${endDate}&limit=500${branchParam}`,
      { credentials: "include" }
    );

    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    const items = data.items || [];

    // Group transactions by time bucket
    const buckets: { income: number; expense: number }[] = labels.map(() => ({ income: 0, expense: 0 }));

    for (const item of items) {
      const date = new Date(item.createdAt);
      let bucketIndex = 0;

      switch (range) {
        case "day": {
          const hour = date.getHours();
          bucketIndex = Math.min(Math.floor((hour - 8) / 2), labels.length - 1);
          if (hour < 8) bucketIndex = 0;
          break;
        }
        case "week": {
          const dayStart = new Date(start);
          const diffDays = Math.floor((date.getTime() - dayStart.getTime()) / (1000 * 60 * 60 * 24));
          bucketIndex = Math.min(Math.max(diffDays, 0), labels.length - 1);
          break;
        }
        case "month": {
          const weekOfMonth = Math.floor((date.getDate() - 1) / 7);
          bucketIndex = Math.min(weekOfMonth, labels.length - 1);
          break;
        }
        case "year": {
          bucketIndex = date.getMonth();
          break;
        }
      }

      if (bucketIndex >= 0 && bucketIndex < labels.length) {
        if (item.type === "income") {
          buckets[bucketIndex].income += item.amount;
        } else {
          buckets[bucketIndex].expense += item.amount;
        }
      }
    }

    return labels.map((label, i) => ({
      label,
      income: buckets[i].income,
      expense: buckets[i].expense,
      net: buckets[i].income - buckets[i].expense,
    }));
  } catch {
    // Return empty chart on error
    const { labels } = getDateRange(range);
    return labels.map((label) => ({ label, income: 0, expense: 0, net: 0 }));
  }
}

function ChartSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <div key={r} className="h-6 w-16 bg-gray-100 rounded-full" />
        ))}
      </div>
      <div className="h-40 bg-gray-50 rounded-xl" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ChartError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-4 text-center">
      <p className="text-[11px] text-[#EF4444] mb-1">Gagal memuat data</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 mx-auto text-[11px] text-[#2563EB] font-medium"
      >
        <RefreshCw className="w-3 h-3" />
        Coba lagi
      </button>
    </div>
  );
}

function ComboChart({ data }: { data: CashflowPoint[] }) {
  const allValues = data.flatMap((d) => [d.income, d.expense, d.net]);
  const max = Math.max(...allValues, 1);
  const chartH = 120;
  const barW = 14;
  const gap = Math.max(8, Math.floor(240 / data.length) - barW * 2 - 6);

  return (
    <svg
      viewBox={`0 0 ${data.length * (barW * 2 + gap + 6)} ${chartH}`}
      className="w-full"
      style={{ height: chartH }}
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line
          key={pct}
          x1="0"
          y1={chartH - chartH * pct}
          x2={data.length * (barW * 2 + gap + 6)}
          y2={chartH - chartH * pct}
          stroke="#E5E7EB"
          strokeWidth="0.5"
        />
      ))}

      {/* Bars + net line points */}
      {data.map((d, i) => {
        const x = i * (barW * 2 + gap + 6);
        const incomeH = (d.income / max) * (chartH - 10);
        const expenseH = (d.expense / max) * (chartH - 10);
        return (
          <g key={i}>
            {/* Income bar */}
            <rect
              x={x}
              y={chartH - incomeH}
              width={barW}
              height={incomeH}
              rx="3"
              fill="#10B981"
              opacity="0.75"
            />
            {/* Expense bar */}
            <rect
              x={x + barW + 3}
              y={chartH - expenseH}
              width={barW}
              height={expenseH}
              rx="3"
              fill="#EF4444"
              opacity="0.65"
            />
            {/* Label */}
            <text
              x={x + barW + 1}
              y={chartH - 2}
              textAnchor="middle"
              fontSize="7"
              fill="#9CA3AF"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Net line */}
      <polyline
        points={data
          .map((d, i) => {
            const x = i * (barW * 2 + gap + 6) + barW + 1;
            const y = chartH - (d.net / max) * (chartH - 10);
            return `${x},${y}`;
          })
          .join(" ")}
        fill="none"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = i * (barW * 2 + gap + 6) + barW + 1;
        const y = chartH - (d.net / max) * (chartH - 10);
        return (
          <circle key={i} cx={x} cy={y} r="3" fill="#2563EB" />
        );
      })}
    </svg>
  );
}

export default function CashflowWidget() {
  const [range, setRange] = useState<CashflowRange>("week");
  const { state: filter } = usePlatformFilter();
  const branchIds = filter.branchIds.length > 0 ? filter.branchIds : undefined;

  const fetcher = useMemo(
    () => () => fetchCashflowData(range, branchIds),
    [range, branchIds]
  );

  const { data, loading, error, refresh } = useWidgetProvider(fetcher, [range, branchIds]);

  const totals = data
    ? {
        income: data.reduce((s, d) => s + d.income, 0),
        expense: data.reduce((s, d) => s + d.expense, 0),
        net: data.reduce((s, d) => s + d.net, 0),
      }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.25 }}
      className="px-5 py-2"
      style={{ background: "#F6F8FC" }}
    >
      <div
        className="rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#111827]">
            Cashflow Overview
          </h3>
        </div>

        {/* Range toggle */}
        <div className="flex gap-1 mb-3">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{
                background: range === r ? "#2563EB" : "#F3F4F6",
                color: range === r ? "#FFFFFF" : "#6B7280",
              }}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {loading && <ChartSkeleton />}
        {error && <ChartError onRetry={refresh} />}

        {data && !loading && !error && (
          <>
            <ComboChart data={data} />

            {/* Summary */}
            {totals && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="px-2.5 py-2 rounded-xl bg-[#10B981]/8">
                  <p className="text-[9px] text-[#6B7280] mb-0.5">
                    Pemasukan
                  </p>
                  <p className="text-[11px] font-bold text-[#10B981]">
                    {formatIDR(totals.income)}
                  </p>
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-[#EF4444]/8">
                  <p className="text-[9px] text-[#6B7280] mb-0.5">
                    Pengeluaran
                  </p>
                  <p className="text-[11px] font-bold text-[#EF4444]">
                    {formatIDR(totals.expense)}
                  </p>
                </div>
                <div className="px-2.5 py-2 rounded-xl bg-[#2563EB]/8">
                  <p className="text-[9px] text-[#6B7280] mb-0.5">
                    Bersih
                  </p>
                  <p className="text-[11px] font-bold text-[#2563EB]">
                    {formatIDR(totals.net)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
