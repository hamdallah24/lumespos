import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import { fetchInsights } from "@/lib/home/home-data";
import type { InsightItem } from "@/lib/home/home-data";

const icons: Record<string, string> = {
  TrendingUp: "📈",
  AlertTriangle: "⚠️",
  CheckCircle2: "✅",
};

function InsightRow({ item }: { item: InsightItem }) {
  return (
    <div className="flex items-center gap-4 py-5 group cursor-pointer">
      <div
        className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 text-lg"
        style={{ background: "#F1F5F9" }}
      >
        {icons[item.icon] || "📋"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#111827] leading-tight">
          {item.title}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-0.5 truncate">
          {item.description}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-[#94A3B8]">{item.time}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1]" style={{ opacity: 0.4 }} />
      </div>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <div className="w-[42px] h-[42px] rounded-xl bg-gray-100 shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 w-28 bg-gray-100 rounded-full mb-1.5" />
            <div className="h-2.5 w-44 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIInsight() {
  const { data: insights, loading, error, refresh } = useWidgetProvider(fetchInsights, []);

  return (
    <div className="px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-[24px] bg-white p-5"
        style={{ boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-bold text-[#111827]">AI Insight</h3>
          <button className="flex items-center gap-1 text-[12px] text-[#2563EB] font-semibold hover:underline">
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading && <InsightSkeleton />}
        {error && (
          <div className="py-6 text-center">
            <p className="text-[12px] text-[#EF4444] mb-2">Failed to load insights</p>
            <button onClick={refresh} className="text-[12px] text-[#2563EB] font-semibold">
              Try again
            </button>
          </div>
        )}
        {insights && insights.length === 0 && (
          <p className="text-[13px] text-[#6B7280] py-6 text-center">No insights yet</p>
        )}
        {insights && insights.length > 0 && (
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.03)" }}>
            {insights.slice(0, 3).map((item) => (
              <InsightRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
