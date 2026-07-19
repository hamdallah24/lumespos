import { motion } from "framer-motion";
import { Cpu, Zap } from "lucide-react";

function IsometricSkyline() {
  return (
    <svg
      viewBox="0 0 320 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 110 }}
    >
      {/* Ground */}
      <rect x="0" y="100" width="320" height="20" fill="rgba(255,255,255,0.05)" />

      {/* Buildings — isometric-ish with simple perspective */}
      {/* Building 1 — tall */}
      <rect x="20" y="40" width="28" height="60" rx="2" fill="rgba(255,255,255,0.12)" />
      <rect x="22" y="42" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="30" y="42" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="22" y="54" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="30" y="54" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="22" y="66" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="30" y="66" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="22" y="78" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="30" y="78" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />

      {/* Building 2 — medium */}
      <rect x="58" y="55" width="24" height="45" rx="2" fill="rgba(255,255,255,0.10)" />
      <rect x="60" y="58" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="67" y="58" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="60" y="68" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="67" y="68" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="60" y="78" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="67" y="78" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />

      {/* Building 3 — tallest with antenna */}
      <rect x="92" y="25" width="30" height="75" rx="2" fill="rgba(255,255,255,0.14)" />
      <rect x="104" y="15" width="6" height="10" rx="1" fill="rgba(255,255,255,0.12)" />
      <rect x="95" y="30" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="103" y="30" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="111" y="30" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="95" y="42" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="103" y="42" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="111" y="42" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="95" y="54" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="103" y="54" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="111" y="54" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="95" y="66" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="103" y="66" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="111" y="66" width="6" height="8" rx="1" fill="rgba(255,255,255,0.08)" />

      {/* Building 4 — wide low */}
      <rect x="134" y="65" width="40" height="35" rx="2" fill="rgba(255,255,255,0.09)" />
      <rect x="137" y="68" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="146" y="68" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="155" y="68" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="137" y="78" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="146" y="78" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="155" y="78" width="7" height="6" rx="1" fill="rgba(255,255,255,0.06)" />

      {/* Building 5 — medium with dome */}
      <rect x="182" y="48" width="26" height="52" rx="2" fill="rgba(255,255,255,0.11)" />
      <ellipse cx="195" cy="48" rx="13" ry="6" fill="rgba(255,255,255,0.08)" />
      <rect x="185" y="54" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="192" y="54" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="199" y="54" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="185" y="64" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="192" y="64" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="199" y="64" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />

      {/* Building 6 — slim tall */}
      <rect x="216" y="35" width="20" height="65" rx="2" fill="rgba(255,255,255,0.13)" />
      <rect x="219" y="40" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="225" y="40" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="219" y="50" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="225" y="50" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="219" y="60" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />
      <rect x="225" y="60" width="4" height="6" rx="1" fill="rgba(255,255,255,0.08)" />

      {/* Building 7 — short wide */}
      <rect x="244" y="70" width="32" height="30" rx="2" fill="rgba(255,255,255,0.08)" />
      <rect x="247" y="73" width="6" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="255" y="73" width="6" height="6" rx="1" fill="rgba(255,255,255,0.06)" />
      <rect x="263" y="73" width="6" height="6" rx="1" fill="rgba(255,255,255,0.06)" />

      {/* Building 8 — far right */}
      <rect x="284" y="52" width="24" height="48" rx="2" fill="rgba(255,255,255,0.10)" />
      <rect x="287" y="56" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="294" y="56" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="287" y="66" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />
      <rect x="294" y="66" width="5" height="6" rx="1" fill="rgba(255,255,255,0.07)" />

      {/* Clouds */}
      <ellipse cx="60" cy="20" rx="18" ry="6" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="170" cy="15" rx="22" ry="7" fill="rgba(255,255,255,0.05)" />
      <ellipse cx="260" cy="22" rx="16" ry="5" fill="rgba(255,255,255,0.05)" />

      {/* Data flow lines */}
      <line x1="30" y1="95" x2="110" y2="95" stroke="rgba(37,99,235,0.3)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="110" y1="95" x2="195" y2="95" stroke="rgba(37,99,235,0.25)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="195" y1="95" x2="280" y2="95" stroke="rgba(37,99,235,0.2)" strokeWidth="1" strokeDasharray="4 3" />

      {/* Data nodes */}
      <circle cx="30" cy="95" r="3" fill="#2563EB" opacity="0.6" />
      <circle cx="110" cy="95" r="3" fill="#2563EB" opacity="0.5" />
      <circle cx="195" cy="95" r="3" fill="#2563EB" opacity="0.4" />
      <circle cx="280" cy="95" r="3" fill="#2563EB" opacity="0.3" />

      {/* Pulse dots */}
      <circle cx="30" cy="95" r="6" fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.2">
        <animate attributeName="r" from="3" to="8" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default function DigitalTwinHero() {
  return (
    <div className="px-5 py-3" style={{ background: "#F6F8FC" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background:
            "linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #0EA5E9 100%)",
          minHeight: 180,
        }}
      >
        {/* Skyline */}
        <div className="absolute bottom-0 left-0 right-0">
          <IsometricSkyline />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center py-6 px-6">
          {/* Badge — top right */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm">
            <Cpu className="w-3 h-3 text-white" />
            <span className="text-[10px] font-semibold text-white">
              Digital Twin
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#10B981]/80">
              <Zap className="w-2 h-2 text-white" />
              <span className="text-[8px] font-bold text-white">LIVE</span>
            </span>
          </div>

          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-3 mt-2">
            <Cpu className="w-6 h-6 text-white" />
          </div>

          {/* Sentence */}
          <p className="text-[12px] text-white/75 text-center leading-relaxed">
            Semua sistem beroperasi normal.
            <br />
            Tidak ada anomali kritis terdeteksi.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
