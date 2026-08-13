import { useEffect, useRef } from "react";

interface SmokeOverlayProps {
  /** Number of smoke puffs. Default: 18 */
  intensity?: number;
  /** Base color tint. Default: "gray" */
  color?: "gray" | "warm" | "dark";
  /** How fast smoke rises. Default: 0.5 */
  speed?: number;
  /** Optional className for positioning. */
  className?: string;
}

const colorMap: Record<NonNullable<SmokeOverlayProps["color"]>, string> = {
  gray: "rgba(180, 180, 180, ",
  warm: "rgba(200, 190, 180, ",
  dark: "rgba(120, 120, 120, ",
};

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  drift: number;
  driftSpeed: number;
}

export function SmokeOverlay({
  intensity = 18,
  color = "gray",
  speed = 0.5,
  className = "fixed inset-0 pointer-events-none z-40",
}: SmokeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puffsRef = useRef<Puff[]>([]);
  const rafRef = useRef<number>(0);
  const prefix = colorMap[color];

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

    const createPuff = (initial = false): Puff => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // 60% from bottom, 40% from left/right sides
      const zone = Math.random();
      let x: number;
      let y: number;
      let vx = (Math.random() - 0.5) * 0.18;

      if (zone < 0.5) {
        // bottom edge
        x = Math.random() * w;
        y = h + 20 + Math.random() * 40;
      } else if (zone < 0.75) {
        // left edge
        x = -30 - Math.random() * 40;
        y = h * (0.55 + Math.random() * 0.45);
        vx = 0.12 + Math.random() * 0.12;
      } else {
        // right edge
        x = w + 30 + Math.random() * 40;
        y = h * (0.55 + Math.random() * 0.45);
        vx = -(0.12 + Math.random() * 0.12);
      }

      const size = 90 + Math.random() * 110;

      return {
        x,
        y,
        vx,
        vy: -(0.1 + Math.random() * 0.14) * speed,
        size,
        maxSize: size * (2.6 + Math.random() * 1.6),
        alpha: 0,
        life: 0,
        maxLife: 1100 + Math.random() * 1400,
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.0015 + Math.random() * 0.003,
      };
    };

    puffsRef.current = Array.from({ length: intensity }, () =>
      createPuff(true),
    );

    const drawPuff = (p: Puff) => {
      const t = p.life / p.maxLife;
      const fadeIn = 0.18;
      const fadeOut = 0.72;
      let a = 0;
      if (t < fadeIn) {
        a = t / fadeIn;
      } else if (t > fadeOut) {
        a = Math.max(0, (1 - t) / (1 - fadeOut));
      } else {
        a = 1;
      }
      a *= 0.055; // soft, diffuse
      p.alpha = a;

      const currentSize = p.size + (p.maxSize - p.size) * t;
      // stretch horizontally so puffs read as drifting waves, not round spots
      const wobble = Math.sin(p.drift) * 0.25;
      const rx = currentSize * (1.6 + wobble);
      const ry = currentSize * (0.75 - wobble * 0.25);

      const gradient = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        currentSize,
      );
      gradient.addColorStop(0, `${prefix}${a})`);
      gradient.addColorStop(0.35, `${prefix}${a * 0.6})`);
      gradient.addColorStop(0.7, `${prefix}${a * 0.22})`);
      gradient.addColorStop(1, `${prefix}0)`);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "blur(18px)";
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.drift * 0.6) * 0.25);
      ctx.scale(rx / currentSize, ry / currentSize);
      ctx.translate(-p.x, -p.y);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < puffsRef.current.length; i++) {
        const p = puffsRef.current[i]!;
        p.life++;
        p.drift += p.driftSpeed;
        p.x += p.vx + Math.sin(p.drift) * 0.12;
        p.y += p.vy;
        p.vy *= 0.9995;

        if (p.life >= p.maxLife || p.y < -80) {
          puffsRef.current[i] = createPuff();
          continue;
        }

        drawPuff(p);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [intensity, color, speed, prefix]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
