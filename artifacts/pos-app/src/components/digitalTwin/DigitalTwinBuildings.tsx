// Sprint 3B — Detailed building silhouettes with windows + breathing animation
import { useDigitalTwin } from "./DigitalTwinProvider";

interface BuildingDef {
  id: string;
  x: number; yBase: number;
  w: number; h: number;
  color: string; glowColor: string;
  windows: boolean; antenna: boolean; dome: boolean;
  delay: number;
}

const BUILDINGS: BuildingDef[] = [
  { id: "b1", x: 10, yBase: 78, w: 16, h: 52, color: "#1E293B", glowColor: "#334155", windows: true, antenna: true, dome: false, delay: 0 },
  { id: "b2", x: 28, yBase: 72, w: 12, h: 44, color: "#0F172A", glowColor: "#1E293B", windows: true, antenna: false, dome: false, delay: 1.2 },
  { id: "b3", x: 42, yBase: 80, w: 20, h: 60, color: "#1E293B", glowColor: "#334155", windows: true, antenna: true, dome: false, delay: 2.4 },
  { id: "b4", x: 64, yBase: 74, w: 14, h: 50, color: "#0F172A", glowColor: "#1E293B", windows: true, antenna: false, dome: true, delay: 3.6 },
  { id: "b5", x: 80, yBase: 76, w: 16, h: 46, color: "#1E293B", glowColor: "#334155", windows: true, antenna: true, dome: false, delay: 4.8 },
];

function BuildingWindows({ b }: { b: BuildingDef }) {
  const rows = Math.floor(b.h / 8);
  const cols = Math.floor(b.w / 5);
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => (
          <rect
            key={`${b.id}-w-${ri}-${ci}`}
            x={`${b.x + 1.5 + ci * 5}%`}
            y={`${b.yBase + 1 + ri * 8}%`}
            width="3%"
            height="5%"
            rx="0.3"
            fill="#FDE68A"
            opacity={0.06}
          />
        ))
      )}
    </>
  );
}

export default function DigitalTwinBuildings() {
  const { state } = useDigitalTwin();
  const isNight = state.timeOfDay === "night";

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[5]"
      style={{
        transform: `translate(${state.parallaxBuildingX}px, ${state.parallaxBuildingY}px)`,
        opacity: 0.4,
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bldgBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? "#1E3A5F" : "#1E293B"} stopOpacity="0.7" />
            <stop offset="100%" stopColor={isNight ? "#0F1D3A" : "#0F172A"} stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {BUILDINGS.map((b) => (
          <g key={b.id} style={{ animation: `buildingBreathe ${5 + b.delay * 0.6}s ease-in-out ${b.delay}s infinite` }}>
            {/* Main body */}
            <rect x={`${b.x}%`} y={`${b.yBase}%`} width={`${b.w}%`} height={`${b.h}%`} rx="2" fill="url(#bldgBody)" />

            {/* Windows */}
            {b.windows && <BuildingWindows b={b} />}

            {/* Night window glow */}
            {b.windows && isNight && (
              Array.from({ length: Math.floor(b.h / 8) }).map((_, ri) =>
                Array.from({ length: Math.floor(b.w / 5) }).map((_, ci) => (
                  <rect
                    key={`${b.id}-wg-${ri}-${ci}`}
                    x={`${b.x + 1.5 + ci * 5}%`}
                    y={`${b.yBase + 1 + ri * 8}%`}
                    width="3%"
                    height="5%"
                    rx="0.3"
                    fill="#FDE68A"
                    opacity={(Math.sin(ri * 1.7 + ci * 2.3 + b.delay) + 1) * 0.06 + 0.02}
                  />
                ))
              )
            )}

            {/* Antenna */}
            {b.antenna && (
              <>
                <rect x={`${b.x + b.w / 2 - 1}%`} y={`${b.yBase - 8}%`} width="2%" height="8%" fill={isNight ? "#3B82F6" : "#94A3B8"} opacity="0.5" />
                <circle cx={`${b.x + b.w / 2}%`} cy={`${b.yBase - 9}%`} r="0.6" fill={isNight ? "#F87171" : "#EF4444"} opacity="0.7">
                  {isNight && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />}
                </circle>
              </>
            )}

            {/* Dome */}
            {b.dome && (
              <ellipse cx={`${b.x + b.w / 2}%`} cy={`${b.yBase}%`} rx={`${b.w / 2}%`} ry="5%" fill={isNight ? "#1E40AF" : "#475569"} opacity="0.5" />
            )}

            {/* Top edge highlight */}
            <rect x={`${b.x}%`} y={`${b.yBase}%`} width={`${b.w}%`} height="1" rx="0.5" fill={isNight ? "rgba(59,130,246,0.25)" : "rgba(148,163,184,0.15)"} />
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
