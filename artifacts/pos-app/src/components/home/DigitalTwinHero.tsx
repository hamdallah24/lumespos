import { motion } from "framer-motion";
import { Cpu, Zap, Activity, TrendingUp, Cloud, Users, Target } from "lucide-react";

const INDICATORS = [
  { icon: TrendingUp, label: "Revenue", color: "#34D399" },
  { icon: Cloud, label: "Cloud", color: "#60A5FA" },
  { icon: Users, label: "Executives", color: "#A78BFA" },
  { icon: Target, label: "Mission", color: "#F472B6" },
];

function AnimatedCircles() {
  return (
    <>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 240,
          height: 240,
          top: -60,
          right: -60,
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          animation: "heroBreathe 10s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 180,
          height: 180,
          bottom: "5%",
          left: "35%",
          background: "radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)",
          animation: "heroBreathe 8s ease-in-out 3s infinite",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 120,
          height: 120,
          top: "15%",
          left: -30,
          background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
          animation: "heroBreathe 9s ease-in-out 5s infinite",
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes heroBreathe {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.2); opacity: 0.3; }
            }
          `,
        }}
      />
    </>
  );
}

function IsometricSkyline() {
  return (
    <svg viewBox="0 0 320 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
      <rect x="14" y="34" width="28" height="48" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="16" y="36" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="36" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="32" y="36" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="16" y="47" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="24" y="47" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="32" y="47" width="6" height="7" rx="1" fill="rgba(255,255,255,0.05)" />

      <rect x="52" y="44" width="24" height="38" rx="3" fill="rgba(255,255,255,0.06)" />
      <rect x="55" y="47" width="5" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="62" y="47" width="5" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="69" y="47" width="5" height="5" rx="1" fill="rgba(255,255,255,0.04)" />

      <rect x="86" y="22" width="32" height="60" rx="3" fill="rgba(255,255,255,0.10)" />
      <rect x="99" y="12" width="6" height="10" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="89" y="26" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="97" y="26" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="105" y="26" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="89" y="37" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="97" y="37" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="105" y="37" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="89" y="48" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="97" y="48" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="105" y="48" width="6" height="7" rx="1" fill="rgba(255,255,255,0.06)" />

      <rect x="128" y="52" width="38" height="30" rx="3" fill="rgba(255,255,255,0.05)" />
      <rect x="131" y="55" width="7" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="140" y="55" width="7" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="149" y="55" width="7" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="158" y="55" width="7" height="5" rx="1" fill="rgba(255,255,255,0.04)" />

      <rect x="174" y="36" width="26" height="46" rx="3" fill="rgba(255,255,255,0.07)" />
      <rect x="176" y="39" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="183" y="39" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="190" y="39" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <ellipse cx="187" cy="36" rx="13" ry="5" fill="rgba(255,255,255,0.04)" />

      <rect x="208" y="26" width="22" height="56" rx="3" fill="rgba(255,255,255,0.09)" />
      <rect x="210" y="30" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="217" y="30" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="210" y="40" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="217" y="40" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />

      <rect x="240" y="50" width="34" height="32" rx="3" fill="rgba(255,255,255,0.06)" />
      <rect x="243" y="53" width="6" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="251" y="53" width="6" height="5" rx="1" fill="rgba(255,255,255,0.04)" />
      <rect x="259" y="53" width="6" height="5" rx="1" fill="rgba(255,255,255,0.04)" />

      <rect x="282" y="40" width="24" height="42" rx="3" fill="rgba(255,255,255,0.07)" />
      <rect x="284" y="43" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="291" y="43" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="284" y="53" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />
      <rect x="291" y="53" width="5" height="6" rx="1" fill="rgba(255,255,255,0.05)" />

      <ellipse cx="56" cy="16" rx="18" ry="6" fill="rgba(255,255,255,0.03)" />
      <ellipse cx="190" cy="12" rx="22" ry="7" fill="rgba(255,255,255,0.025)" />
      <ellipse cx="270" cy="20" rx="16" ry="5" fill="rgba(255,255,255,0.025)" />
    </svg>
  );
}

export default function DigitalTwinHero() {
  return (
    <div className="px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[32px]"
        style={{
          background: "linear-gradient(160deg, #071426 0%, #0C1D3A 30%, #102A54 70%, #071426 100%)",
          height: 240,
          boxShadow: "0 20px 50px rgba(15,23,42,0.12)",
        }}
      >
        <div
          className="absolute inset-0 rounded-[32px]"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(0.5px)" }}
        />
        <AnimatedCircles />

        <div className="absolute bottom-0 left-0 right-0" style={{ opacity: 0.35, transform: "scale(1.25)" }}>
          <IsometricSkyline />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
          <div className="absolute top-4 left-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(4px)" }}
            >
              <Cpu className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[11px] font-semibold text-white/70">Digital Twin</span>
            </div>
          </div>

          <div className="absolute top-4 right-4">
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-[9px] font-bold text-[#34D399] tracking-widest uppercase">Live</span>
            </div>
          </div>

          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 48px rgba(14,165,233,0.12), inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <Activity className="w-9 h-9 text-white/85" />
          </div>

          <p className="text-[14px] text-white/55 text-center leading-relaxed font-medium mt-5 max-w-[280px]">
            System Operating Normally
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            AI systems coordinated
          </p>

          <div className="absolute bottom-4 left-4 flex items-center gap-3">
            {INDICATORS.map((ind) => {
              const Icon = ind.icon;
              return (
                <div key={ind.label} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: ind.color, boxShadow: `0 0 6px ${ind.color}80` }}
                  />
                  <Icon className="w-2.5 h-2.5 text-white/30" />
                  <span className="text-[9px] text-white/30 font-medium">{ind.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
