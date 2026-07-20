// Sprint 1 — Glass overlay + AI grid + floating labels
import { motion } from "framer-motion";
import { useDigitalTwin } from "./DigitalTwinProvider";
import DigitalTwinEffects from "./DigitalTwinEffects";

function AiGridLines() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
      <defs>
        <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={`${8 + i * 8}%`}
          x2="100%"
          y2={`${8 + i * 8}%`}
          stroke="url(#gridGrad)"
          strokeWidth="0.5"
          strokeDasharray="8 32"
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`v-${i}`}
          x1={`${12 + i * 12}%`}
          y1="0"
          x2={`${12 + i * 12}%`}
          y2="100%"
          stroke="url(#gridGrad)"
          strokeWidth="0.5"
          strokeDasharray="8 32"
        />
      ))}
    </svg>
  );
}

function FloatingLabel({ label, value, position }: { label: string; value: string; position: "tl" | "tr" | "br" }) {
  const posClasses: Record<string, string> = {
    tl: "top-3 left-3",
    tr: "top-3 right-3",
    br: "bottom-3 right-3",
  };

  return (
    <div
      className={`absolute z-20 ${posClasses[position]}`}
      style={{
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 12,
        padding: "6px 12px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
        <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p className="text-[11px] text-white/80 font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function TimeSinceUpdate() {
  const { state } = useDigitalTwin();
  const seconds = Math.floor((Date.now() - state.lastUpdated) / 1000);

  return (
    <div className="absolute bottom-3 left-3 z-20">
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
        style={{
          background: "rgba(15,23,42,0.4)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span className="w-1 h-1 rounded-full bg-[#60A5FA]" />
        <span className="text-[9px] text-white/40">
          Updated {seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`}
        </span>
      </div>
    </div>
  );
}

export default function DigitalTwinOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Glass layer */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(255,255,255,0.02)",
          backdropFilter: "blur(0.3px)",
          WebkitBackdropFilter: "blur(0.3px)",
        }}
      />

      {/* AI grid */}
      <AiGridLines />

      {/* Floating labels */}
      <FloatingLabel label="Live Digital Twin" value="Lumé OS v1.0" position="tl" />
      <FloatingLabel label="Runtime" value="Healthy" position="tr" />

      {/* Time since update */}
      <TimeSinceUpdate />

      {/* Animated effects */}
      <DigitalTwinEffects />

      {/* Hotspots + panels — pointer-events for hotspots only */}
      {children}
    </div>
  );
}
