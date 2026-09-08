import { useEffect, useRef } from "react";

interface FireSparksOverlayProps {
  /** Number of simultaneous sparks on screen. Default: 40 */
  intensity?: number;
  /** Base color of sparks. Default: "orange" */
  color?: "orange" | "red" | "yellow" | "amber" | "white";
  /** How fast sparks rise. Default: 1 */
  speed?: number;
  /** Also emit a few sparks from the left/right edges. Default: true */
  fromSides?: boolean;
  /** Show a subtle fire glow gradient at the bottom. Default: false */
  glow?: boolean;
  /** Optional className for positioning. */
  className?: string;
}

const colorMap: Record<NonNullable<FireSparksOverlayProps["color"]>, string[]> = {
  orange: ["#ff7a18", "#ff9d3c", "#ffb457", "#ffd08a"],
  red: ["#ff4d2d", "#ff6b45", "#ff8a5c", "#ffab7a"],
  yellow: ["#ffd60a", "#ffe066", "#fff0a8", "#fff7cf"],
  amber: ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"],
  white: ["#ffffff", "#f0f0f0", "#dcdcdc", "#f7f7f7"],
};

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  drift: number;
  driftSpeed: number;
}

export function FireSparksOverlay({
  intensity = 40,
  color = "orange",
  speed = 1,
  fromSides = true,
  glow = false,
  className = "fixed inset-0 pointer-events-none z-50",
}: FireSparksOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number>(0);
  const palette = colorMap[color];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const createSpark = (initial = false): Spark => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // ~25% of sparks come in from the left/right edges
      const side = fromSides && Math.random() < 0.25;
      const fromLeft = Math.random() < 0.5;
      const x = side ? (fromLeft ? -10 : w + 10) : Math.random() * w;
      const y = side
        ? h * (0.45 + Math.random() * 0.55)
        : initial
          ? Math.random() * h
          : h + Math.random() * 30;

      return {
        x,
        y,
        vx: side ? (fromLeft ? 0.15 : -0.15) * (0.6 + Math.random()) : (Math.random() - 0.5) * 0.14,
        vy: -(0.16 + Math.random() * 0.26) * speed,
        size: Math.random() * 0.9 + 0.35,
        alpha: 0,
        color: palette[Math.floor(Math.random() * palette.length)]!,
        life: 0,
        maxLife: 500 + Math.random() * 500,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.004 + Math.random() * 0.008,
      };
    };

    sparksRef.current = Array.from({ length: intensity }, () => createSpark(true));

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < sparksRef.current.length; i++) {
        const s = sparksRef.current[i]!;
        s.life++;
        s.drift += s.driftSpeed;
        s.x += s.vx + Math.sin(s.drift) * 0.16;
        s.y += s.vy;
        s.vy *= 0.9995;

        // fade in, hold, fade out
        const t = s.life / s.maxLife;
        s.alpha = t < 0.15 ? t / 0.15 : t > 0.65 ? Math.max(0, (1 - t) / 0.35) : 1;

        if (s.life >= s.maxLife || s.y < -20) {
          sparksRef.current[i] = createSpark();
          continue;
        }

        const flicker = 0.55 + Math.abs(Math.sin(s.life * 0.06 + s.drift)) * 0.45;
        const a = s.alpha * flicker * 0.9;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowBlur = s.size * 5;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [intensity, color, speed, fromSides, palette]);

  return (
    <>
      <canvas ref={canvasRef} className={className} aria-hidden="true" />
      {glow && (
        <div
          className={`${className} bg-gradient-to-t from-orange-600/10 to-transparent`}
          aria-hidden="true"
        />
      )}
    </>
  );
}
