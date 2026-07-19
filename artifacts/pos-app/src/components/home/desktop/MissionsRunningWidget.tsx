import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import {
  fetchMissionsRunning,
  type MissionRunningItem,
} from "@/lib/home/home-data";

const STATUS_CONFIG: Record<
  MissionRunningItem["status"],
  { label: string; bg: string; text: string }
> = {
  running: { label: "Running", bg: "#10B98115", text: "#10B981" },
  planning: { label: "Planning", bg: "#2563EB15", text: "#2563EB" },
  review: { label: "Review", bg: "#F59E0B15", text: "#F59E0B" },
};

function MissionSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-3 w-28 bg-gray-100 rounded-full mb-2" />
            <div className="h-1.5 w-full bg-gray-100 rounded-full" />
          </div>
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function MissionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-4 text-center">
      <p className="text-[11px] text-[#EF4444] mb-1">Gagal memuat misi</p>
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

function MissionRow({ item }: { item: MissionRunningItem }) {
  const cfg = STATUS_CONFIG[item.status];
  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[#111827]">
          {item.name}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
          style={{ background: cfg.bg, color: cfg.text }}
        >
          {cfg.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${item.progress}%`,
              background: cfg.text,
            }}
          />
        </div>
        <span className="text-[10px] text-[#6B7280] tabular-nums w-8 text-right">
          {item.progress}%
        </span>
      </div>
    </div>
  );
}

export default function MissionsRunningWidget() {
  const { data, loading, error, refresh } = useWidgetProvider(
    fetchMissionsRunning,
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.35 }}
      className="px-5 py-2"
      style={{ background: "#F6F8FC" }}
    >
      <div
        className="rounded-2xl bg-white p-4"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-bold text-[#111827]">
            Misi Berjalan
          </h3>
          <span className="text-[11px] text-[#6B7280]">
            {data ? `${data.length} aktif` : "—"}
          </span>
        </div>

        {loading && <MissionSkeleton />}
        {error && <MissionError onRetry={refresh} />}

        {data && !loading && !error && data.length === 0 && (
          <p className="text-[12px] text-[#6B7280] py-3 text-center">
            Tidak ada misi aktif
          </p>
        )}

        {data && !loading && !error && data.length > 0 && (
          <div className="divide-y divide-gray-50">
            {data.map((item) => (
              <MissionRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
