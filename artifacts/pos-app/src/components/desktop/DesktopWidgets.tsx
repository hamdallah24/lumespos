import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Target,
  Activity,
  Cloud,
  Clock,
} from "lucide-react";
import { useExecutiveStore } from "@/lib/desktop/executive-store";

function SystemClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <p className="text-2xl font-light text-white/70 tabular-nums leading-none">
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </p>
      <p className="text-[10px] text-white/25 mt-1">
        {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

export default function DesktopWidgets() {
  const { executives } = useExecutiveStore();
  const activeExecs = executives.filter(
    (e) => e.status === "thinking" || e.status === "executing"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="absolute top-12 right-5 z-[100] flex flex-col gap-3"
    >
      {/* Clock widget */}
      <div
        className="px-5 py-4 rounded-2xl"
        style={{
          background: "rgba(7, 20, 38, 0.4)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(142, 216, 255, 0.06)",
        }}
      >
        <SystemClock />
      </div>

      {/* Status widgets */}
      <div className="grid grid-cols-2 gap-2">
        <WidgetCard
          icon={DollarSign}
          label="Revenue"
          value="—"
          color="#10B981"
        />
        <WidgetCard
          icon={Target}
          label="Missions"
          value={activeExecs.length > 0 ? `${activeExecs.length}` : "0"}
          color="#8B5CF6"
        />
        <WidgetCard
          icon={Activity}
          label="AI Health"
          value={`${Math.round(executives.reduce((a, e) => a + e.health, 0) / executives.length)}%`}
          color="#3B82F6"
        />
        <WidgetCard
          icon={Cloud}
          label="Cloud"
          value="OK"
          color="#0EA5E9"
        />
      </div>
    </motion.div>
  );
}

function WidgetCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="px-3 py-2.5 rounded-xl"
      style={{
        background: "rgba(7, 20, 38, 0.4)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(142, 216, 255, 0.06)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: `${color}80` } as React.CSSProperties}>
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-[9px] font-medium text-white/30">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white/60">{value}</p>
    </div>
  );
}
