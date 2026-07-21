// Sprint 3B — Living Digital Twin with depth layers
import { motion } from "framer-motion";
import DigitalTwinProvider from "./DigitalTwinProvider";
import DigitalTwinTransition from "./DigitalTwinTransition";
import DigitalTwinRoadLights from "./DigitalTwinRoadLights";
import DigitalTwinAINetwork from "./DigitalTwinAINetwork";
import DigitalTwinAtmosphere from "./DigitalTwinAtmosphere";
import DigitalTwinOverlay from "./DigitalTwinOverlay";
import DigitalTwinHotspots from "./DigitalTwinHotspots";

function TwinInner() {
  return (
    <div className="relative w-full select-none overflow-hidden" style={{ aspectRatio: "16/9", minHeight: 240 }}>
      {/* Background video */}
      <div className="absolute inset-0">
        <DigitalTwinTransition />
      </div>

      {/* Road lights — night only overlay */}
      <DigitalTwinRoadLights />

      {/* Atmospheric glow behind AI Core */}
      <DigitalTwinAtmosphere />

      {/* AI Network lines */}
      <DigitalTwinAINetwork />

      {/* UI Overlay (glass, grid, labels, effects, hotspots) */}
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
