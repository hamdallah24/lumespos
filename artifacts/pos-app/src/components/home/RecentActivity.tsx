import { motion } from "framer-motion";
import { useWidgetProvider } from "@/lib/home/widget-provider";
import { fetchRecentActivity, formatIDR } from "@/lib/home/home-data";
import type { RecentActivityItem } from "@/lib/home/home-data";

function ActivityRow({ item }: { item: RecentActivityItem }) {
  const isPositive = item.amount >= 0;

  return (
    <div className="flex items-center gap-4" style={{ height: 68 }}>
      <div
        className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 text-[13px] font-extrabold"
        style={{
          background: isPositive
            ? "radial-gradient(circle at 30% 30%, rgba(16,185,129,0.15), rgba(16,185,129,0.06))"
            : "radial-gradient(circle at 30% 30%, rgba(239,68,68,0.12), rgba(239,68,68,0.05))",
          color: isPositive ? "#10B981" : "#EF4444",
        }}
      >
        {isPositive ? "+" : "−"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#111827] leading-tight truncate">
          {item.transaction}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-0.5">
          {item.location} · {item.time}
        </p>
      </div>
      <span
        className="text-[15px] font-bold shrink-0 tracking-[-0.01em]"
        style={{ color: isPositive ? "#10B981" : "#EF4444" }}
      >
        {isPositive ? "+" : "−"}{formatIDR(Math.abs(item.amount))}
      </span>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4" style={{ height: 68 }}>
          <div className="w-[42px] h-[42px] rounded-xl bg-gray-100 shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-36 bg-gray-100 rounded-full mb-1.5" />
            <div className="h-3 w-28 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-20 bg-gray-100 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function RecentActivity() {
  const { data: activities, loading, error, refresh } = useWidgetProvider(fetchRecentActivity, []);

  return (
    <div className="px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-[24px] bg-white p-5"
        style={{ boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}
      >
        <h3 className="text-[16px] font-bold text-[#111827] mb-1">Recent Activity</h3>

        {loading && <ActivitySkeleton />}
        {error && (
          <div className="py-6 text-center">
            <p className="text-[12px] text-[#EF4444] mb-2">Failed to load activity</p>
            <button onClick={refresh} className="text-[12px] text-[#2563EB] font-semibold">
              Try again
            </button>
          </div>
        )}
        {activities && activities.length === 0 && (
          <p className="text-[13px] text-[#6B7280] py-6 text-center">No recent activity</p>
        )}
        {activities && activities.length > 0 && (
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.03)" }}>
            {activities.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
