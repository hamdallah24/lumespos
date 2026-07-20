import { motion } from "framer-motion";
import { Cpu, Zap, Activity } from "lucide-react";

function AnimatedCircles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          top: -40,
          right: -40,
          background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
          animation: "breathe 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 140,
          height: 140,
          bottom: -20,
          left: "30%",
          background: "radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)",
          animation: "breathe 4s ease-in-out 1s infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 100,
          height: 100,
          top: "20%",
          left: -20,
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          animation: "breathe 5s ease-in-out 2s infinite",
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes breathe {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.15); opacity: 0.6; }
            }
          `,
        }}
      />
    </div>
  );
}

function IsometricSkyline() {
  return (
    <svg
      viewBox="0 0 320 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
    >
      <rect x="0" y="65" width="320" height="15" fill="rgba(255,255,255,0.04)" rx="2" />
      <rect x="16" y="28" width="26" height="42" rx="3" fill="rgba(255,255,255,0.10)" />
      <rect x="18" y="30" width="5" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="25" y="30" width="5" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="33" y="30" width="5" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="50" y="38" width="22" height="32" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="53" y="41" width="4" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="59" y="41" width="4" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="65" y="41" width="4" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="82" y="18" width="28" height="52" rx="3" fill="rgba(255,255,255,0.13)" />
      <rect x="94" y="10" width="4" height="8" rx="1" fill="rgba(255,255,255,0.10)" />
      <rect x="85" y="22" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="92" y="22" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="99" y="22" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="85" y="32" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="92" y="32" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="99" y="32" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="85" y="42" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="92" y="42" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="99" y="42" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="120" y="44" width="36" height="26" rx="3" fill="rgba(255,255,255,0.07)" />
      <rect x="123" y="47" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="131" y="47" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="139" y="47" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="162" y="32" width="24" height="38" rx="3" fill="rgba(255,255,255,0.09)" />
      <rect x="164" y="35" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="170" y="35" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="176" y="35" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="174" cy="32" rx="12" ry="4" fill="rgba(255,255,255,0.05)" />
      <rect x="194" y="24" width="20" height="46" rx="3" fill="rgba(255,255,255,0.11)" />
      <rect x="196" y="28" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="202" y="28" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="208" y="28" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="222" y="42" width="36" height="28" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="225" y="45" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="233" y="45" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="241" y="45" width="6" height="5" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="268" y="36" width="22" height="34" rx="3" fill="rgba(255,255,255,0.09)" />
      <rect x="270" y="39" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="276" y="39" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="282" y="39" width="4" height="5" rx="1" fill="rgba(255,255,255,0.06)" />
      <circle cx="48" cy="62" r="2" fill="#60A5FA" opacity="0.4" />
      <circle cx="110" cy="62" r="2" fill="#60A5FA" opacity="0.35" />
      <circle cx="186" cy="62" r="2" fill="#60A5FA" opacity="0.3" />
      <circle cx="256" cy="62" r="2" fill="#60A5FA" opacity="0.25" />
      <line x1="48" y1="62" x2="110" y2="62" stroke="#60A5FA" strokeWidth="0.5" opacity="0.2" strokeDasharray="3 4" />
      <line x1="110" y1="62" x2="186" y2="62" stroke="#60A5FA" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4" />
      <line x1="186" y1="62" x2="256" y2="62" stroke="#60A5FA" strokeWidth="0.5" opacity="0.1" strokeDasharray="3 4" />
      <ellipse cx="60" cy="14" rx="16" ry="5" fill="rgba(255,255,255,0.04)" />
      <ellipse cx="210" cy="10" rx="20" ry="6" fill="rgba(255,255,255,0.03)" />
      <ellipse cx="280" cy="18" rx="14" ry="4" fill="rgba(255,255,255,0.03)" />
    </svg>
  );
}

export default function DigitalTwinHero() {
  return (
    <div className="px-6 py-0">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[32px]"
        style={{
          background: "linear-gradient(145deg, #0F172A 0%, #1E3A5F 35%, #1B2F4F 60%, #0F172A 100%)",
          minHeight: 200,
        }}
      >
        <AnimatedCircles />

        <div className="absolute bottom-0 left-0 right-0 opacity-40">
          <IsometricSkyline />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center py-8 px-6">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Cpu className="w-3.5 h-3.5 text-white/80" />
              <span className="text-[11px] font-semibold text-white/80">
                Digital Twin
              </span>
            </div>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: "rgba(16,185,129,0.2)",
              }}
            >
              <Zap className="w-2.5 h-2.5 text-[#34D399]" />
              <span className="text-[9px] font-bold text-[#34D399] tracking-wide">
                LIVE
              </span>
            </div>
          </div>

          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mt-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 32px rgba(14,165,233,0.15), inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <Activity className="w-7 h-7 text-white/90" />
          </div>

          <p className="text-[13px] text-white/60 text-center leading-relaxed font-medium max-w-[280px]">
            System Operating Normally.{" "}
            <span className="text-white/40">No critical anomalies detected.</span>
          </p>

          <div className="flex items-center gap-2 mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] text-white/40 font-medium">All Systems Operational</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
