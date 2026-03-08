"use client";
import { useRef, useEffect } from "react";

export default function DustParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w: number, h: number;
    const resize = () => {
      w = c.width = c.parentElement?.clientWidth || window.innerWidth;
      h = c.height = c.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = window.innerWidth < 768 ? 25 : 50;
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * (w || 400),
      y: Math.random() * (h || 800),
      r: Math.random() * 1.3 + 0.3,
      dx: (Math.random() - 0.5) * 0.12,
      dy: -(Math.random() * 0.2 + 0.04),
      o: Math.random() * 0.4 + 0.08,
      ph: Math.random() * Math.PI * 2,
    }));

    let animId: number;
    let paused = false;
    let lastFrame = 0;
    const FRAME_INTERVAL = 41.67; // ~24fps

    const draw = (now: number) => {
      animId = requestAnimationFrame(draw);
      if (paused) return;
      if (now - lastFrame < FRAME_INTERVAL) return;
      lastFrame = now;

      ctx.clearRect(0, 0, w, h);
      const t = now * 0.001;
      for (const p of pts) {
        p.x += p.dx + Math.sin(t * 0.6 + p.ph) * 0.1;
        p.y += p.dy;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,205,155,${p.o * (0.6 + 0.4 * Math.sin(t * 1.2 + p.ph))})`;
        ctx.fill();
      }
    };
    animId = requestAnimationFrame(draw);

    const onVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 7,
        pointerEvents: "none",
      }}
    />
  );
}
