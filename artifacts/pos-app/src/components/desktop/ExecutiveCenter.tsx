import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Code,
  Settings,
  TrendingUp,
  Megaphone,
  Users,
  Brain,
  Activity,
  Clock,
  Wrench,
  ChevronRight,
  X,
} from "lucide-react";
import { useExecutiveStore } from "@/lib/desktop/executive-store";
import type { AIExecutive } from "@/lib/desktop/types";

const execIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown, Code, Settings, TrendingUp, Megaphone, Users, Brain,
};

const statusConfig: Record<string, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "Idle", color: "#10B981", pulse: false },
  thinking: { label: "Thinking", color: "#3B82F6", pulse: true },
  executing: { label: "Executing", color: "#F59E0B", pulse: true },
  waiting: { label: "Waiting", color: "#8B5CF6", pulse: false },
  sleeping: { label: "Sleeping", color: "#64748B", pulse: false },
};

function ExecutiveCard({ exec }: { exec: AIExecutive }) {
  const IconComp = execIconMap[exec.icon] || Brain;
  const status = statusConfig[exec.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-3 rounded-xl border border-white/5 hover:bg-white/[0.02] transition-colors"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${exec.color}15` }}
        >
          <span style={{ color: exec.color } as React.CSSProperties}>
            <IconComp className="w-4 h-4" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-white/80">{exec.role}</span>
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${status.pulse ? "animate-pulse" : ""}`}
                style={{ background: status.color }}
              />
              <span className="text-[9px] font-medium" style={{ color: status.color }}>
                {status.label}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-white/30 truncate">{exec.title}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center">
          <p className="text-[10px] text-white/25">Health</p>
          <p className="text-[11px] font-semibold text-white/60">{exec.health}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/25">Confidence</p>
          <p className="text-[11px] font-semibold text-white/60">{exec.confidence}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-white/25">Status</p>
          <p className="text-[11px] font-semibold" style={{ color: status.color }}>
            {exec.status === "sleeping" ? "OFF" : "ON"}
          </p>
        </div>
      </div>

      {/* Mission / Last Action */}
      {exec.currentMission && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-1">
          <Activity className="w-3 h-3 text-primary/60" />
          <span className="truncate">{exec.currentMission}</span>
        </div>
      )}
      {exec.lastAction && !exec.currentMission && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Clock className="w-3 h-3" />
          <span className="truncate">{exec.lastAction}</span>
        </div>
      )}
      {exec.currentTool && (
        <div className="flex items-center gap-1.5 text-[10px] text-white/25 mt-1">
          <Wrench className="w-3 h-3" />
          <span className="truncate">{exec.currentTool}</span>
        </div>
      )}
    </motion.div>
  );
}

interface ExecutiveCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutiveCenter({ isOpen, onClose }: ExecutiveCenterProps) {
  const { executives } = useExecutiveStore();

  const activeCount = executives.filter(
    (e) => e.status === "thinking" || e.status === "executing"
  ).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-8 right-0 bottom-0 w-[320px] z-[9990] flex flex-col"
          style={{
            background: "rgba(8, 14, 28, 0.96)",
            backdropFilter: "blur(32px)",
            borderLeft: "1px solid rgba(142, 216, 255, 0.08)",
            boxShadow: "-20px 0 40px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-primary/70" />
              </div>
              <div>
                <h3 className="text-[12px] font-semibold text-white/80">Executive Center</h3>
                <p className="text-[9px] text-white/30">
                  {activeCount} active · {executives.length} total
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Executive list */}
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {executives.map((exec) => (
              <ExecutiveCard key={exec.id} exec={exec} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/5">
            <p className="text-[10px] text-white/20 text-center">
              Executive Runtime v1.0 · Lumé AI Core
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
