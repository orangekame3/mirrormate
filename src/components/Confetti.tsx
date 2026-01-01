"use client";

import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";

export type EffectType = "confetti" | "hearts" | "sparkles";

interface ConfettiProps {
  isActive: boolean;
  effectType?: EffectType;
  onComplete?: () => void;
}

export default function Confetti({ isActive, effectType = "confetti", onComplete }: ConfettiProps) {
  const hasTriggered = useRef(false);

  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    // White/silver palette for magic mirror aesthetic
    const colors = ["#FFFFFF", "#F0F0F0", "#E8E8E8", "#D0D0D0", "#C0C0C0"];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    };

    frame();
  }, [onComplete]);

  const fireHearts = useCallback(() => {
    const scalar = 2;
    const heart = confetti.shapeFromText({ text: "🤍", scalar });

    const defaults = {
      spread: 360,
      ticks: 80,
      gravity: 0.4,
      decay: 0.96,
      startVelocity: 25,
      shapes: [heart],
      scalar,
    };

    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.5 } });

    setTimeout(() => {
      confetti({ ...defaults, particleCount: 20, origin: { x: 0.3, y: 0.6 } });
      confetti({ ...defaults, particleCount: 20, origin: { x: 0.7, y: 0.6 } });
      onComplete?.();
    }, 300);
  }, [onComplete]);

  const fireSparkles = useCallback(() => {
    const scalar = 2;
    const star = confetti.shapeFromText({ text: "✦", scalar });

    // White sparkle particles
    const colors = ["#FFFFFF", "#F8F8F8", "#E0E0E0"];

    confetti({
      particleCount: 60,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      shapes: [star],
      scalar,
      ticks: 120,
      gravity: 0.2,
      decay: 0.94,
      colors,
    });

    setTimeout(() => onComplete?.(), 2000);
  }, [onComplete]);

  useEffect(() => {
    if (isActive && !hasTriggered.current) {
      hasTriggered.current = true;

      switch (effectType) {
        case "hearts":
          fireHearts();
          break;
        case "sparkles":
          fireSparkles();
          break;
        case "confetti":
        default:
          fireConfetti();
          break;
      }
    }

    if (!isActive) {
      hasTriggered.current = false;
    }
  }, [isActive, effectType, fireConfetti, fireHearts, fireSparkles]);

  return null; // canvas-confetti handles its own rendering
}
