import { useEffect, useRef } from "react";

interface TrailParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  createdAt: number;
  lifetime: number;
  color: string;
}

const MAX_PARTICLES = 48;
const PARTICLE_LIFETIME = 520;
const PARTICLE_COLORS = ["#06B6D4", "#A855F7", "#10B981"];

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const particles: TrailParticle[] = [];
    let animationFrame = 0;
    let lastParticleAt = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resizeCanvas = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const animate = (now: number) => {
      context.clearRect(0, 0, width, height);

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        const age = now - particle.createdAt;
        const progress = age / particle.lifetime;

        if (progress >= 1) {
          particles.splice(index, 1);
          continue;
        }

        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.velocityX *= 0.98;
        particle.velocityY *= 0.98;

        const alpha = (1 - progress) * 0.65;
        const radius = particle.radius * (1 - progress * 0.45);

        context.beginPath();
        context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        context.fillStyle = particle.color;
        context.globalAlpha = alpha;
        context.shadowColor = particle.color;
        context.shadowBlur = 10;
        context.fill();
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;

      if (particles.length > 0) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        animationFrame = 0;
      }
    };

    const requestAnimation = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      const now = performance.now();
      if (now - lastParticleAt < 12) {
        return;
      }
      lastParticleAt = now;

      particles.push({
        x: event.clientX,
        y: event.clientY,
        velocityX: (Math.random() - 0.5) * 0.8,
        velocityY: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 2.5,
        createdAt: now,
        lifetime: PARTICLE_LIFETIME,
        color: PARTICLE_COLORS[
          Math.floor(Math.random() * PARTICLE_COLORS.length)
        ],
      });

      if (particles.length > MAX_PARTICLES) {
        particles.splice(0, particles.length - MAX_PARTICLES);
      }

      requestAnimation();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}
