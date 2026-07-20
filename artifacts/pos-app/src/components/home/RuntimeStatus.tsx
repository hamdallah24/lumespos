import { ChevronRight } from "lucide-react";
import { useExecutiveStore } from "@/lib/desktop/executive-store";

export default function RuntimeStatus() {
  const { executives } = useExecutiveStore();
  const onlineCount = executives.filter(
    (e) => e.status === "idle" || e.status === "thinking" || e.status === "executing"
  ).length;
  const isHealthy = executives.every((e) => e.health > 50);

  return (
    <div className="px-6">
      <div
        className="flex items-center justify-between px-5 rounded-[24px] active:scale-[0.985] transition-transform duration-180"
        style={{
          height: 60,
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 10px 30px rgba(15,23,42,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{
              background: isHealthy ? "#10B981" : "#F59E0B",
              boxShadow: isHealthy
                ? "0 0 10px rgba(16,185,129,0.5)"
                : "0 0 10px rgba(245,158,11,0.5)",
              animation: "runtimePulse 2s ease-in-out infinite",
            }}
          />
          <span className="text-[15px] font-semibold text-[#111827]">
            {isHealthy ? "Runtime Healthy" : "Runtime Issues"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#6B7280] font-medium">
            {onlineCount} Executives Online
          </span>
          <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes runtimePulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.6; }
            }
          `,
        }}
      />
    </div>
  );
}
