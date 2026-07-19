import { motion } from "framer-motion";
import { Cpu, Zap } from "lucide-react";

export default function DigitalTwinHero() {
  return (
    <div className="px-5 py-3" style={{ background: "#F6F8FC" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #0EA5E9 100%)",
          minHeight: 180,
        }}
      >
        {/* Abstract shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-32 h-32 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl rotate-45"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center py-8 px-6">
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm mb-4">
            <Cpu className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">
              Digital Twin
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#10B981]/80">
              <Zap className="w-2.5 h-2.5 text-white" />
              <span className="text-[9px] font-bold text-white">LIVE</span>
            </span>
          </div>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-3">
            <Cpu className="w-7 h-7 text-white" />
          </div>

          {/* Sentence */}
          <p className="text-[13px] text-white/80 text-center leading-relaxed">
            Semua sistem beroperasi normal.
            <br />
            Tidak ada anomali kritis terdeteksi.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
