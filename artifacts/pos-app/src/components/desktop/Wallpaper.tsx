import { useEffect, useRef, useState } from "react";

export default function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(60, Math.floor((window.innerWidth * window.innerHeight) / 20000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1,
    }));

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.clearRect(0, 0, w, h);

      const time = Date.now() * 0.0003;
      const g1x = w * 0.2 + Math.sin(time) * w * 0.1;
      const g1y = h * 0.3 + Math.cos(time * 0.7) * h * 0.1;
      const rg1 = ctx!.createRadialGradient(g1x, g1y, 0, g1x, g1y, w * 0.4);
      rg1.addColorStop(0, "rgba(21, 101, 255, 0.08)");
      rg1.addColorStop(1, "rgba(21, 101, 255, 0)");
      ctx!.fillStyle = rg1;
      ctx!.fillRect(0, 0, w, h);

      const g2x = w * 0.8 + Math.cos(time * 0.5) * w * 0.1;
      const g2y = h * 0.7 + Math.sin(time * 0.6) * h * 0.1;
      const rg2 = ctx!.createRadialGradient(g2x, g2y, 0, g2x, g2y, w * 0.35);
      rg2.addColorStop(0, "rgba(14, 165, 233, 0.06)");
      rg2.addColorStop(1, "rgba(14, 165, 233, 0)");
      ctx!.fillStyle = rg2;
      ctx!.fillRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(142, 216, 255, ${p.opacity})`;
        ctx!.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mounted]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #071426 0%, #0A1E3D 40%, #0C1A33 70%, #060E1C 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: mounted ? 0.6 : 0, transition: "opacity 0.5s" }}
      />
    </div>
  );
}
