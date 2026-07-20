// Sprint 3B — Living Digital Twin with depth layers
import { motion } from "framer-motion";
import DigitalTwinProvider, { useDigitalTwin } from "./DigitalTwinProvider";
import DigitalTwinTransition from "./DigitalTwinTransition";
import DigitalTwinBuildings from "./DigitalTwinBuildings";
import DigitalTwinRoadLights from "./DigitalTwinRoadLights";
import DigitalTwinAINetwork from "./DigitalTwinAINetwork";
import DigitalTwinAtmosphere from "./DigitalTwinAtmosphere";
import DigitalTwinOverlay from "./DigitalTwinOverlay";
import DigitalTwinHotspots from "./DigitalTwinHotspots";

function TwinInner() {
  const { state } = useDigitalTwin();

  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: "16/9", minHeight: 240 }}>
      {/* Layer 0: Sky / background — slowest parallax */}
      <div
        className="absolute inset-0 scale-[1.08]"
        style={{ transform: `translate(${state.parallaxBgX}px, ${state.parallaxBgY}px)` }}
      >
        {/* Layer 1: Ground / city image with road lights */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${state.parallaxCityX}px, ${state.parallaxCityY}px) scale(${state.cameraScale})`,
            transformOrigin: "center center",
          }}
        >
          <DigitalTwinTransition />
        </div>

        {/* Layer 2: Buildings — faster parallax, independent */}
        <DigitalTwinBuildings />

        {/* Road lights — night only, between buildings and atmosphere */}
        <DigitalTwinRoadLights />
      </div>

      {/* Layer 3: Atmospheric glow behind AI Core */}
      <DigitalTwinAtmosphere />

      {/* AI Network lines */}
      <DigitalTwinAINetwork />

      {/* Layer 4: UI Overlay (glass, grid, labels, effects, hotspots) */}
      <DigitalTwinOverlay>
        <DigitalTwinHotspots />
      </DigitalTwinOverlay>
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
