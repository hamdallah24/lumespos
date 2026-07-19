import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import {
  fetchUpcomingSchedule,
  type ScheduleItem,
} from "@/lib/home/home-data";

const iconMap: Record<string, typeof Calendar> = {
  Calendar,
  Users,
  ClipboardCheck,
  TrendingUp,
};

function ScheduleSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-3 py-3 rounded-xl bg-gray-50">
          <div className="h-2.5 w-8 bg-gray-100 rounded-full mb-2" />
          <div className="h-3 w-20 bg-gray-100 rounded-full mb-1.5" />
          <div className="h-2.5 w-24 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ScheduleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-4 text-center">
      <p className="text-[11px] text-[#EF4444] mb-1">Gagal memuat jadwal</p>
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

function ScheduleCard({ item }: { item: ScheduleItem }) {
  const Icon = iconMap[item.icon] || Calendar;
  return (
    <div
      className="px-3 py-3 rounded-xl"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
    >
      <p className="text-[10px] font-bold text-[#2563EB] mb-1.5">
        {item.time}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-[#2563EB]/8 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#2563EB]" />
        </div>
        <span className="text-[11px] font-semibold text-[#111827] truncate">
          {item.title}
        </span>
      </div>
      <p className="text-[10px] text-[#6B7280] truncate">{item.subtitle}</p>
    </div>
  );
}

export default function UpcomingScheduleWidget() {
  const { data, loading, error, refresh } = useWidgetProvider(
    fetchUpcomingSchedule,
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.3 }}
      className="px-5 py-2"
      style={{ background: "#F6F8FC" }}
    >
      <div
        className="rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#111827]">
            Jadwal Mendatang
          </h3>
        </div>

        {loading && <ScheduleSkeleton />}
        {error && <ScheduleError onRetry={refresh} />}

        {data && !loading && !error && data.length === 0 && (
          <p className="text-[12px] text-[#6B7280] py-3 text-center">
            Tidak ada jadwal
          </p>
        )}

        {data && !loading && !error && data.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {data.slice(0, 4).map((item) => (
              <ScheduleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
