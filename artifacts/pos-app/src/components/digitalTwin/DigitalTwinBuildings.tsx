// Sprint 3B — Building silhouettes with breathing hover animation
import { useDigitalTwin } from "./DigitalTwinProvider";

const BUILDINGS = [
  { x: 14, w: 18, h: 55, delay: 0 },   // far left
  { x: 36, w: 14, h: 38, delay: 1.2 },
  { x: 52, w: 22, h: 62, delay: 2.4 },  // center-left
  { x: 76, w: 16, h: 48, delay: 3.6 },
  { x: 90, w: 20, h: 42, delay: 4.8 },  // right
];

export default function DigitalTwinBuildings() {
  const { state } = useDigitalTwin();
  const isNight = state.timeOfDay === "night";

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{
        transform: `translate(${state.parallaxBuildingX}px, ${state.parallaxBuildingY}px)`,
        opacity: 0.35,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bldgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? "#1E3A5F" : "#1E293B"} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isNight ? "#0F1D3A" : "#0F172A"} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="bldgGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? "#3B82F6" : "#94A3B8"} stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {BUILDINGS.map((b, i) => (
          <g key={i}>
            <rect x={`${b.x}%`} y={`${100 - b.h}%`} width={`${b.w}%`} height={`${b.h}%`}
              rx="1.5" fill="url(#bldgGrad)" style={{ animation: `buildingBreathe ${5 + i * 0.8}s ease-in-out ${b.delay}s infinite` }} />
            {BUILDINGS.map((b, i) => (
              <rect key={`glow-${i}`} x={`${b.x}%`} y={`${100 - b.h}%`} width={`${b.w}%`} height={`${b.h}%`}
                rx="1.5" fill="url(#bldgGlow)" style={{ animation: `buildingBreathe ${5 + i * 0.8}s ease-in-out ${b.delay}s infinite` }} />
            ))}
          </g>
        ))}
      </svg>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes buildingBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2.5px); }
        }
      `}} />
    </div>
  );
}
