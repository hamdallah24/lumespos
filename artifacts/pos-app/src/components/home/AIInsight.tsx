import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import { fetchInsights } from "@/lib/home/home-data";
import type { InsightItem } from "@/lib/home/home-data";

const iconMap: Record<string, typeof TrendingUp> = {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
};

function InsightRow({ item }: { item: InsightItem }) {
  const Icon = iconMap[item.icon] || CheckCircle2;

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#F6F8FC] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-[#2563EB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827]">{item.title}</p>
        <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
          {item.description}
        </p>
      </div>
      <span className="text-[10px] text-[#6B7280] shrink-0 mt-1">
        {item.time}
      </span>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-100" />
          <div className="flex-1">
            <div className="h-3 w-24 bg-gray-100 rounded-full mb-1.5" />
            <div className="h-2.5 w-40 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIInsight() {
  const { data: insights, loading, error, refresh } = useWidgetProvider(
    fetchInsights,
    []
  );

  return (
    <div className="px-5 py-2" style={{ background: "#F6F8FC" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2 }}
        className="rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[14px] font-bold text-[#111827]">AI Insight</h3>
          <button className="flex items-center gap-0.5 text-[11px] text-[#2563EB] font-medium">
            Lihat Semua
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {loading && <InsightSkeleton />}

        {error && (
          <div className="py-3 text-center">
            <p className="text-[11px] text-[#EF4444] mb-1">Gagal memuat</p>
            <button
              onClick={refresh}
              className="text-[11px] text-[#2563EB] font-medium"
            >
              Coba lagi
            </button>
          </div>
        )}

        {insights && insights.length === 0 && (
          <p className="text-[12px] text-[#6B7280] py-3 text-center">
            Tidak ada insight
          </p>
        )}

        {insights && insights.length > 0 && (
          <div className="divide-y divide-gray-50">
            {insights.slice(0, 3).map((item) => (
              <InsightRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
