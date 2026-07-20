// Sprint 3B — Flowing road lights, night-only
import { useDigitalTwin } from "./DigitalTwinProvider";

export default function DigitalTwinRoadLights() {
  const { state } = useDigitalTwin();

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[4]"
      style={{ opacity: state.timeOfDay === "night" ? 0.25 : 0, transition: "opacity 2.5s ease-in-out" }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="roadGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0" />
            <stop offset="50%" stopColor="#FDE68A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal road mid */}
        <rect x="0" y="75" width="100" height="0.5" fill="url(#roadGlow)" opacity="0.5">
          <animate attributeName="x" from="-100" to="100" dur="8s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="78" width="100" height="0.5" fill="url(#roadGlow)" opacity="0.3">
          <animate attributeName="x" from="-100" to="100" dur="12s" repeatCount="indefinite" />
        </rect>

        {/* Horizontal road top */}
        <rect x="0" y="58" width="100" height="0.4" fill="url(#roadGlow)" opacity="0.3">
          <animate attributeName="x" from="100" to="-100" dur="10s" repeatCount="indefinite" />
        </rect>

        {/* Vertical road center */}
        <rect x="48" y="0" width="0.5" height="100" fill="url(#roadGlow)" opacity="0.2"
          style={{ transform: "rotate(0deg)" }}>
          <animate attributeName="y" from="-100" to="100" dur="15s" repeatCount="indefinite" />
        </rect>
        <rect x="52" y="0" width="0.4" height="100" fill="url(#roadGlow)" opacity="0.15">
          <animate attributeName="y" from="-100" to="100" dur="18s" repeatCount="indefinite" />
        </rect>

        {/* Node lights at intersections */}
        {[{ x: 48, y: 58 }, { x: 48, y: 75 }, { x: 48, y: 78 }].map((p, i) => (
          <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="0.6" fill="#FDE68A" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}
