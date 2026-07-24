import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { KpiTrend } from "../types/workspace";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export function KpiCard({ title, value, icon: Icon, color, subtitle, trend }: { title: string; value: string; icon: any; color: string; subtitle?: string; trend?: KpiTrend }) {
  return (
    <motion.div {...fadeUp} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-4 hover:bg-white/[0.08] transition-all group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] text-white/40 font-medium uppercase tracking-wider truncate">{title}</p>
          <p className="text-base sm:text-xl font-bold mt-0.5 text-white truncate group-hover:text-white/90 transition-colors">{value}</p>
          {subtitle && <p className="text-[8px] text-white/30 mt-0.5">{subtitle}</p>}
          {trend && (
            <div className={"flex items-center gap-1 mt-1 text-[9px] font-medium " + (trend.direction === "up" ? "text-emerald-400" : trend.direction === "down" ? "text-rose-400" : "text-white/30")}>
              {trend.direction === "up" ? <TrendingUp className="w-2.5 h-2.5" /> : trend.direction === "down" ? <TrendingDown className="w-2.5 h-2.5" /> : null}
              {trend.change}% vs last period
            </div>
          )}
        </div>
        <div className={"w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ml-2 " + color}>
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
      </div>
    </motion.div>
  );
}

export function MiniBar({ data, height = 32, color = "from-blue-500 to-blue-400" }: { data: number[]; height?: number; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((v, i) => (
        <div key={i} className={"flex-1 rounded-t-sm bg-gradient-to-t " + color + " opacity-70 hover:opacity-100 transition-opacity"}
          style={{ height: ((v / max) * 100) + "%" }} />
      ))}
    </div>
  );
}

export function ValidationBadge({ status }: { status: string }) {
  const symbols: Record<string, string> = { passed: "\u2713", warning: "!", failed: "\u2717", info: "i" };
  const colorMap: Record<string, string> = { passed: "text-emerald-400", warning: "text-amber-400", failed: "text-rose-400", info: "text-sky-400" };
  const c = colorMap[status] || "text-sky-400";
  return <span className={"w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold " + c + " bg-white/5"}>{symbols[status] || "?"}</span>;
}
