// Sprint 1 — Ambient effects: glow particles + floating lights
import { useRef, useEffect } from "react";
import { useDigitalTwin } from "./DigitalTwinProvider";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.3 + 0.05,
    speed: Math.random() * 0.3 + 0.05,
    phase: Math.random() * Math.PI * 2,
  }));
}

export default function DigitalTwinEffects() {
  const { state } = useDigitalTwin();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>(createParticles(state.reducedMotion ? 8 : 25));
  const animFrame = useRef<number>(0);

  useEffect(() => {
    if (state.reducedMotion) {
      particles.current = createParticles(8);
    } else {
      particles.current = createParticles(25);
    }
  }, [state.reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let elapsed = 0;
    let lastTime = Date.now();

    const draw = () => {
      if (document.hidden) {
        animFrame.current = requestAnimationFrame(draw);
        return;
      }

      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      elapsed += dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles.current) {
        p.y -= p.speed * 20 * dt;
        if (p.y < -5) p.y = 105;
        p.x += Math.sin(elapsed * 0.5 + p.phase) * p.speed * 5 * dt;

        const px = (p.x / 100) * canvas.width;
        const py = (p.y / 100) * canvas.height;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 4);

        if (state.timeOfDay === "night") {
          glow.addColorStop(0, `rgba(147,197,253,${p.opacity * 1.5})`);
          glow.addColorStop(1, `rgba(147,197,253,0)`);
        } else {
          glow.addColorStop(0, `rgba(255,255,255,${p.opacity})`);
          glow.addColorStop(1, `rgba(255,255,255,0)`);
        }

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      animFrame.current = requestAnimationFrame(draw);
    };

    animFrame.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrame.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reducedMotion, state.timeOfDay]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
    />
  );
}
