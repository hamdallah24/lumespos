// Sprint 1 — Digital Twin Canvas
// Main orchestrator: day/night crossfade, parallax, camera motion, overlay, hotspots
import { motion } from "framer-motion";
import DigitalTwinProvider, { useDigitalTwin } from "./DigitalTwinProvider";
import DigitalTwinTransition from "./DigitalTwinTransition";
import DigitalTwinOverlay from "./DigitalTwinOverlay";
import DigitalTwinHotspots from "./DigitalTwinHotspots";

function TwinInner() {
  const { state, toggleTimeOfDay } = useDigitalTwin();

  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: "16/9", minHeight: 240 }}>
      {/* Background layer — moves 0.5x */}
      <div
        className="absolute inset-0 scale-[1.08]"
        style={{
          transform: `translate(${state.parallaxBgX}px, ${state.parallaxBgY}px)`,
        }}
      >
        {/* City layer — moves 1x */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${state.parallaxCityX}px, ${state.parallaxCityY}px) scale(${state.cameraScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Day/Night crossfade */}
          <DigitalTwinTransition />

          {/* Glow layer — moves 0.25x, independent from city */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${state.parallaxGlowX}px, ${state.parallaxGlowY}px)`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: state.timeOfDay === "night"
                  ? "radial-gradient(ellipse at 50% 30%, rgba(147,197,253,0.06) 0%, transparent 60%)"
                  : "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Overlay (glass, grid, labels, effects) + hotspots */}
      <DigitalTwinOverlay>
        <DigitalTwinHotspots />
      </DigitalTwinOverlay>

      {/* Click anywhere on the canvas to toggle day/night (when no hotspot panel open) */}
      {!state.activeHotspot && (
        <div
          className="absolute inset-0 z-30 cursor-pointer"
          onClick={() => toggleTimeOfDay()}
        />
      )}
    </div>
  );
}

export default function DigitalTwinCanvas({ className }: { className?: string }) {
  return (
    <DigitalTwinProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-[32px] overflow-hidden ${className || ""}`}
        style={{ boxShadow: "0 20px 50px rgba(15,23,42,0.12)" }}
      >
        <TwinInner />
      </motion.div>
    </DigitalTwinProvider>
  );
}
