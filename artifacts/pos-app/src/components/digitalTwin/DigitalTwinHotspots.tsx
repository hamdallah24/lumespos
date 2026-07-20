// Sprint 1 — Hotspot engine + floating glass panels
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, TrendingUp, Package, Users, UserCog, Sparkles, Cpu, Cloud, Store, Factory, ShoppingBag, DollarSign } from "lucide-react";
import { useDigitalTwin } from "./DigitalTwinProvider";
import type { HotspotDef } from "./types";

const STATUS_COLORS: Record<string, string> = {
  online: "#34D399",
  busy: "#F59E0B",
  offline: "#94A3B8",
  maintenance: "#818CF8",
};

const ICON_MAP: Record<string, typeof Activity> = {
  ShoppingBag, DollarSign, Package, Users, UserCog, Sparkles, Cpu, Cloud, Store, Factory,
};

function HotspotDot({ hotspot }: { hotspot: HotspotDef }) {
  const { selectHotspot } = useDigitalTwin();
  const isPulse = hotspot.id === "ceo";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        selectHotspot(hotspot.id);
      }}
      className="absolute pointer-events-auto group cursor-pointer"
      style={{
        left: `${hotspot.position.x}%`,
        top: `${hotspot.position.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {isPulse && (
        <>
          <span
            className="absolute inset-0 rounded-full"
            style={{
              width: 24,
              height: 24,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#818CF8",
              animation: "dtPulse 2s ease-out infinite",
            }}
          />
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes dtPulse {
                  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.6; }
                  100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                }
              `,
            }}
          />
        </>
      )}
      <span
        className="relative block rounded-full transition-transform duration-180 group-hover:scale-125"
        style={{
          width: 14,
          height: 14,
          background: STATUS_COLORS[hotspot.status] || "#94A3B8",
          boxShadow: `0 0 10px ${STATUS_COLORS[hotspot.status]}60`,
          border: "1.5px solid rgba(255,255,255,0.4)",
        }}
      />
    </button>
  );
}

function HotspotPanel({ hotspot, onClose }: { hotspot: HotspotDef; onClose: () => void }) {
  const Icon = ICON_MAP[hotspot.icon] || Activity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="absolute pointer-events-auto"
      style={{
        left: `${Math.min(hotspot.position.x + 8, 72)}%`,
        top: `${Math.max(hotspot.position.y - 4, 8)}%`,
        minWidth: 180,
      }}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(15,23,42,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <span style={{ color: STATUS_COLORS[hotspot.status] }}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">{hotspot.title}</p>
              <p className="text-[10px] text-white/40 capitalize">{hotspot.status}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[24px] font-bold text-white tracking-tight">{hotspot.metric}</span>
            <span className="text-[11px] text-white/40">{hotspot.metricLabel}</span>
          </div>
          <button className="w-full py-2 rounded-xl text-[11px] font-semibold text-white/80 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function DigitalTwinHotspots() {
  const { state, selectHotspot } = useDigitalTwin();

  return (
    <>
      {state.hotspots.map((hs) => (
        <HotspotDot key={hs.id} hotspot={hs} />
      ))}
      <AnimatePresence>
        {state.activeHotspot && (() => {
          const hs = state.hotspots.find((h) => h.id === state.activeHotspot);
          if (!hs) return null;
          return (
            <>
              <div
                className="fixed inset-0 z-30 pointer-events-auto"
                onClick={() => selectHotspot(null)}
              />
              <HotspotPanel
                key={hs.id}
                hotspot={hs}
                onClose={() => selectHotspot(null)}
              />
            </>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
