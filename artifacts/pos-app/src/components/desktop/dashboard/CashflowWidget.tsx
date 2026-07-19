import { useState } from "react";

const PERIODS = ["Hari", "Minggu", "Bulan", "Tahun"] as const;

const MOCK_DATA = {
  labels: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  income: [4200000, 3800000, 5100000, 4600000, 5900000, 7200000, 3100000],
  expense: [2100000, 1900000, 2800000, 2400000, 3100000, 3800000, 1600000],
};

function formatRp(n: number) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

export default function CashflowWidget() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("Minggu");

  const maxVal = Math.max(...MOCK_DATA.income, ...MOCK_DATA.expense);
  const totalIncome = MOCK_DATA.income.reduce((a, b) => a + b, 0);
  const totalExpense = MOCK_DATA.expense.reduce((a, b) => a + b, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Cashflow Overview</h3>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                period === p
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Chart */}
        <div className="flex-1">
          <div className="flex items-end gap-1.5 h-32">
            {MOCK_DATA.labels.map((label, i) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-[2px] items-end" style={{ height: 100 }}>
                  <div
                    className="flex-1 rounded-t-md transition-all"
                    style={{
                      height: `${(MOCK_DATA.income[i] / maxVal) * 100}%`,
                      background: "linear-gradient(to top, #10B981, #34D399)",
                      minHeight: 4,
                    }}
                  />
                  <div
                    className="flex-1 rounded-t-md transition-all"
                    style={{
                      height: `${(MOCK_DATA.expense[i] / maxVal) * 100}%`,
                      background: "linear-gradient(to top, #EF4444, #F87171)",
                      minHeight: 4,
                    }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-gray-500">Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] text-gray-500">Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="w-36 flex flex-col gap-2.5 shrink-0">
          <div className="p-2.5 rounded-xl bg-emerald-50">
            <p className="text-[10px] text-emerald-600 font-medium">Total Pemasukan</p>
            <p className="text-sm font-bold text-emerald-700">{formatRp(totalIncome)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50">
            <p className="text-[10px] text-rose-600 font-medium">Total Pengeluaran</p>
            <p className="text-sm font-bold text-rose-700">{formatRp(totalExpense)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50">
            <p className="text-[10px] text-indigo-600 font-medium">Cashflow Bersih</p>
            <p className="text-sm font-bold text-indigo-700">{formatRp(net)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
