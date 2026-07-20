// Sprint 3B — AI Network: pulsing connection lines from AI Core to nodes
import { useDigitalTwin } from "./DigitalTwinProvider";

const NODES = [
  { id: "cto", x: 62, y: 22 },
  { id: "caio", x: 38, y: 14 },
  { id: "cloud", x: 78, y: 12 },
  { id: "hr", x: 22, y: 28 },
  { id: "finance", x: 30, y: 40 },
  { id: "inventory", x: 50, y: 55 },
  { id: "crm", x: 70, y: 35 },
];

export default function DigitalTwinAINetwork() {
  const { state } = useDigitalTwin();
  const phase = state.gameTime % 4; // 4-second cycle for pulse

  return (
    <div className="absolute inset-0 pointer-events-none z-[6]"
      style={{ opacity: state.timeOfDay === "night" ? 0.2 : 0.08, transition: "opacity 2.5s ease-in-out" }}>
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <radialGradient id="aiNodeGlow">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Lines from AI Core (CEO at 48,18) to each node */}
        {NODES.map((node, i) => {
          const pulsePos = (phase + i * 0.3) % 1;
          return (
            <g key={node.id}>
              <line x1="48%" y1="18%" x2={`${node.x}%`} y2={`${node.y}%`}
                stroke="#818CF8" strokeWidth="0.4" opacity="0.3" strokeDasharray="2 6" />
              <circle cx={`${48 + (node.x - 48) * pulsePos}%`} cy={`${18 + (node.y - 18) * pulsePos}%`}
                r="1" fill="#A5B4FC" opacity="0.6" />
            </g>
          );
        })}
        {/* AI Core center glow */}
        <circle cx="48%" cy="18%" r="4" fill="url(#aiNodeGlow)" opacity="0.3">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
