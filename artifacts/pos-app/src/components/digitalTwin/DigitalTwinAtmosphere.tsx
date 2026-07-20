// Sprint 3B — Atmospheric glow behind AI Core
import { useDigitalTwin } from "./DigitalTwinProvider";

export default function DigitalTwinAtmosphere() {
  const { state } = useDigitalTwin();

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[3]"
      style={{
        opacity: state.timeOfDay === "night" ? 0.25 : 0.08,
        transition: "opacity 2.5s ease-in-out",
      }}
    >
      <div className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 48% 18%, rgba(99,102,241,0.25) 0%, transparent 45%),
            radial-gradient(ellipse 50% 30% at 48% 30%, rgba(14,165,233,0.12) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
}
