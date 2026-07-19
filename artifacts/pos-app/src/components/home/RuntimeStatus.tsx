import { useExecutiveStore } from "@/lib/desktop/executive-store";

export default function RuntimeStatus() {
  const { executives } = useExecutiveStore();
  const onlineCount = executives.filter(
    (e) => e.status === "idle" || e.status === "thinking" || e.status === "executing"
  ).length;
  const isHealthy = executives.every((e) => e.health > 50);

  return (
    <div className="px-5 py-2" style={{ background: "#F6F8FC" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isHealthy ? "#10B981" : "#F59E0B" }}
          />
          <span className="text-[12px] font-medium text-[#111827]">
            {isHealthy ? "Runtime Sehat" : "Runtime Bermasalah"}
          </span>
        </div>
        <span className="text-[11px] text-[#6B7280]">
          {onlineCount} Eksekutif Online
        </span>
      </div>
    </div>
  );
}
