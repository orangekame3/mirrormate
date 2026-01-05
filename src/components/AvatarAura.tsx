"use client";

import { useEffect, useRef, useMemo } from "react";
import type { AvatarState } from "@/lib/animation";

interface AvatarAuraProps {
  state: AvatarState;
  size?: number;
  className?: string;
}

type AuraState = "off" | "listening" | "thinking" | "speaking" | "idle";

interface Particle {
  angle: number;
  radius: number;
  size: number;
  baseOpacity: number;
  orbitDuration: number; // seconds per revolution
}

function mapAvatarStateToAuraState(state: AvatarState): AuraState {
  switch (state) {
    case "SLEEP":
      return "off";
    case "LISTENING":
      return "listening";
    case "THINKING":
      return "thinking";
    case "SPEAKING":
    case "CONFIRMING":
      return "speaking";
    default:
      return "idle";
  }
}

// Get halo configuration based on state
// Spec: Halo is soft glow behind avatar, no outline/ring shape
function getHaloConfig(auraState: AuraState) {
  switch (auraState) {
    case "off":
      // Mic Off: minimum halo, slight breath contraction
      return { intensity: 0.03, breathScale: 0.02, breathDuration: 4 };
    case "listening":
      // Listening: medium halo, very weak pulse
      return { intensity: 0.12, breathScale: 0.03, breathDuration: 2 };
    case "thinking":
      // Thinking: weak halo
      return { intensity: 0.08, breathScale: 0.01, breathDuration: 3 };
    case "speaking":
      // Speaking: strong halo + heartbeat (1.5-2s period)
      return { intensity: 0.2, breathScale: 0.06, breathDuration: 1.8 };
    default:
      // Idle
      return { intensity: 0.05, breathScale: 0.01, breathDuration: 5 };
  }
}

// Get particle configuration based on state
// Spec: 6-10 particles, 12-18s orbit, no trails
function getParticleConfig(auraState: AuraState) {
  switch (auraState) {
    case "off":
      // Mic Off: particles stopped or very slow
      return { speedMultiplier: 0.1, opacity: 0.15, count: 6 };
    case "listening":
      // Listening: normal speed
      return { speedMultiplier: 1.0, opacity: 0.3, count: 8 };
    case "thinking":
      // Thinking: slower than Listening
      return { speedMultiplier: 0.6, opacity: 0.25, count: 7 };
    case "speaking":
      // Speaking: slightly faster
      return { speedMultiplier: 1.3, opacity: 0.4, count: 10 };
    default:
      // Idle
      return { speedMultiplier: 0.8, opacity: 0.2, count: 6 };
  }
}

export function AvatarAura({ state, size = 320, className = "" }: AvatarAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const prefersReducedMotion = useRef(false);
  const auraState = useMemo(() => mapAvatarStateToAuraState(state), [state]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Initialize particles (6-10 particles, 12-18s orbit)
  useEffect(() => {
    const config = getParticleConfig(auraState);
    const particles: Particle[] = [];
    for (let i = 0; i < config.count; i++) {
      particles.push({
        angle: (Math.PI * 2 * i) / config.count + Math.random() * 0.3,
        radius: size * 0.38 + Math.random() * (size * 0.08),
        size: 2 + Math.random() * 2, // Small dots (2-4px)
        baseOpacity: 0.4 + Math.random() * 0.3,
        orbitDuration: 12 + Math.random() * 6, // 12-18 seconds per revolution
      });
    }
    particlesRef.current = particles;
  }, [auraState, size]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;

    const animate = () => {
      // Skip animation updates when reduced motion is preferred
      if (!prefersReducedMotion.current) {
        timeRef.current += 0.016;
      }
      ctx.clearRect(0, 0, size, size);

      const haloConfig = getHaloConfig(auraState);
      const particleConfig = getParticleConfig(auraState);

      // Calculate breathing effect
      const breathProgress = prefersReducedMotion.current
        ? 0
        : Math.sin(timeRef.current * (Math.PI * 2 / haloConfig.breathDuration));
      const currentIntensity = haloConfig.intensity * (1 + breathProgress * haloConfig.breathScale);

      // Draw halo (soft glow from center, NO ring/outline shape)
      // Spec: "背後の光" - light behind, brightest at center fading outward
      const haloRadius = size * 0.45;
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, haloRadius
      );

      // Smooth fade from center to edge - NO ring shape
      gradient.addColorStop(0, `rgba(255, 255, 255, ${currentIntensity * 0.8})`);
      gradient.addColorStop(0.3, `rgba(255, 255, 255, ${currentIntensity * 0.5})`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, ${currentIntensity * 0.2})`);
      gradient.addColorStop(0.85, `rgba(255, 255, 255, ${currentIntensity * 0.05})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw orbit particles (small dots, no trails)
      particlesRef.current.forEach((particle) => {
        // Update particle position (skip when reduced motion)
        if (!prefersReducedMotion.current) {
          // Speed based on orbit duration (12-18s per revolution)
          const angularSpeed = (Math.PI * 2) / particle.orbitDuration;
          particle.angle += angularSpeed * 0.016 * particleConfig.speedMultiplier;
        }

        const x = centerX + Math.cos(particle.angle) * particle.radius;
        const y = centerY + Math.sin(particle.angle) * particle.radius;

        // Draw particle as simple soft dot (no trails, no lines)
        const opacity = particle.baseOpacity * particleConfig.opacity;

        // Soft glow around particle
        const particleGlow = ctx.createRadialGradient(
          x, y, 0,
          x, y, particle.size * 1.5
        );
        particleGlow.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        particleGlow.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.3})`);
        particleGlow.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.fillStyle = particleGlow;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle core (small white dot)
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(opacity * 1.2, 0.8)})`;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [auraState, size]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

export default AvatarAura;
