import { ChevronRight } from "lucide-react";
import { useExecutiveStore } from "@/lib/desktop/executive-store";

export default function RuntimeStatus() {
  const { executives } = useExecutiveStore();
  const onlineCount = executives.filter(
    (e) => e.status === "idle" || e.status === "thinking" || e.status === "executing"
  ).length;
  const isHealthy = executives.every((e) => e.health > 50);

  return (
    <div className="px-6 py-0">
      <div
        className="flex items-center justify-between px-5 h-14 rounded-[20px] active:scale-[0.98] transition-transform"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.5)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{
              background: isHealthy ? "#10B981" : "#F59E0B",
              boxShadow: isHealthy
                ? "0 0 6px rgba(16,185,129,0.4)"
                : "0 0 6px rgba(245,158,11,0.4)",
            }}
          />
          <span className="text-[14px] font-semibold text-[#111827]">
            {isHealthy ? "Runtime Healthy" : "Runtime Issues"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-[#6B7280]">
            {onlineCount} Executives Online
          </span>
          <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
        </div>
      </div>
    </div>
  );
}
