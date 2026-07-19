import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  icon: React.ReactNode;
  iconBg: string;
  sparkline?: number[];
}

export default function MetricCard({ label, value, delta, icon, iconBg, sparkline }: MetricCardProps) {
  const isPositive = delta !== undefined && delta >= 0;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-400">{label}</span>
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{delta}%
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sparkline && (
        <div className="h-8 flex items-end gap-[2px]">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(10, (v / Math.max(...sparkline)) * 100)}%`,
                background: isPositive
                  ? "linear-gradient(to top, #10B981, #34D399)"
                  : "linear-gradient(to top, #EF4444, #F87171)",
                opacity: 0.7 + (i / sparkline.length) * 0.3,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
