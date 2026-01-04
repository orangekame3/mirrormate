"use client";

/**
 * useAnimationController Hook
 *
 * Main hook that returns real-time animation parameters for the avatar.
 * Manages biological animations: blinking, breathing, gaze tracking.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  type AvatarState,
  type StateContext,
  type AnimationValues,
  STATE_ANIMATION_PARAMS,
  GAZE_CONFIG,
  PERFORMANCE_CONFIG,
  randomInRange,
  lerp,
  clamp,
  easeInOutCubic,
} from "@/lib/animation";

export interface UseAnimationControllerOptions {
  /** Mouse position for gaze tracking */
  mousePosition?: { x: number; y: number };
}

/**
 * Hook for managing real-time animation parameters
 *
 * @param state - Current avatar state
 * @param context - Current state context
 * @param options - Optional configuration
 * @returns Animation values to pass to SimpleAvatar
 */
export function useAnimationController(
  state: AvatarState,
  context: StateContext,
  options: UseAnimationControllerOptions = {}
): AnimationValues {
  const { mousePosition = { x: 0, y: 0 } } = options;

  // Animation state refs (non-reactive for performance)
  const animRef = useRef({
    // Blink timing
    lastBlinkTime: Date.now(),
    nextBlinkInterval: randomInRange(8000, 14000),
    blinkProgress: 0, // 0 = open, 1 = mid-blink, back to 0
    isBlinking: false,

    // Breathing
    breathPhase: 0,
    breathCycleLength: randomInRange(5500, 6500),

    // Gaze
    gazeX: 0,
    gazeY: 0,
    targetGazeX: 0,
    targetGazeY: 0,
    idleWanderTimer: 0,
    idleWanderTargetX: 0,
    idleWanderTargetY: 0,

    // Frame timing
    lastFrameTime: Date.now(),

    // Effect transitions
    glowIntensity: 0,
    targetGlowIntensity: 0,
    ringPulse: 0,
  });

  // Reactive animation values
  const [values, setValues] = useState<AnimationValues>({
    blinkScale: 1,
    breathScale: 0,
    breathOpacity: 0,
    gazeOffset: { x: 0, y: 0 },
    glowIntensity: 0,
    glowColor: "rgba(255, 255, 255, 0.1)",
    pulseValue: 0,
    showParticles: false,
    showRing: false,
    ringPulse: 0,
  });

  // Get current state's animation parameters
  const params = STATE_ANIMATION_PARAMS[state];

  // Update animation parameters when state changes
  useEffect(() => {
    const anim = animRef.current;

    // Update blink interval range
    anim.nextBlinkInterval = randomInRange(
      params.blinkInterval.min,
      params.blinkInterval.max
    );

    // Update breathing cycle
    anim.breathCycleLength = randomInRange(
      params.breathingCycle.min,
      params.breathingCycle.max
    );

    // Update glow target
    if (params.additionalEffects?.glow) {
      anim.targetGlowIntensity = params.additionalEffects.glow.intensity;
    } else {
      anim.targetGlowIntensity = 0;
    }
  }, [state, params]);

  // Main animation loop
  useEffect(() => {
    let rafId: number;
    const anim = animRef.current;

    const animate = () => {
      const now = Date.now();
      const delta = now - anim.lastFrameTime;

      // Frame rate limiting
      if (delta < PERFORMANCE_CONFIG.frameInterval) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      anim.lastFrameTime = now;
      const deltaSeconds = delta / 1000;

      // ========== BLINK ==========
      let blinkScale = 1;

      // Check if it's time for a new blink
      if (!anim.isBlinking && now - anim.lastBlinkTime > anim.nextBlinkInterval) {
        anim.isBlinking = true;
        anim.blinkProgress = 0;
        anim.lastBlinkTime = now;
        anim.nextBlinkInterval = randomInRange(
          params.blinkInterval.min,
          params.blinkInterval.max
        );
      }

      // Animate blink
      if (anim.isBlinking) {
        anim.blinkProgress += deltaSeconds * 8; // Blink takes ~250ms

        if (anim.blinkProgress >= 1) {
          anim.isBlinking = false;
          anim.blinkProgress = 0;
          blinkScale = 1;
        } else {
          // Smooth blink curve: quick close, quick open
          blinkScale = 1 - Math.sin(anim.blinkProgress * Math.PI) * 0.95;
        }
      }

      // ========== BREATHING ==========
      anim.breathPhase += (deltaSeconds / (anim.breathCycleLength / 1000)) * Math.PI * 2;
      if (anim.breathPhase > Math.PI * 2) {
        anim.breathPhase -= Math.PI * 2;
        // Add slight randomness to next cycle
        anim.breathCycleLength = randomInRange(
          params.breathingCycle.min,
          params.breathingCycle.max
        );
      }

      const breathScale = Math.sin(anim.breathPhase) * params.breathingAmplitude.scale;
      const breathOpacity = Math.sin(anim.breathPhase) * params.breathingAmplitude.opacity;

      // ========== GAZE ==========
      let gazeX = anim.gazeX;
      let gazeY = anim.gazeY;

      if (params.gazeTracking) {
        // Track mouse with delay and overshoot
        const targetX = clamp(
          mousePosition.x * GAZE_CONFIG.maxOffset.x,
          -GAZE_CONFIG.maxOffset.x,
          GAZE_CONFIG.maxOffset.x
        );
        const targetY = clamp(
          mousePosition.y * GAZE_CONFIG.maxOffset.y,
          -GAZE_CONFIG.maxOffset.y,
          GAZE_CONFIG.maxOffset.y
        );

        // Apply overshoot
        const overshoot = params.gazeOvershoot;
        anim.targetGazeX = targetX * overshoot;
        anim.targetGazeY = targetY * overshoot;

        // Delayed interpolation
        const delayFactor = params.gazeDelay > 0 ? 1 - Math.exp(-deltaSeconds * (1000 / params.gazeDelay)) : 1;
        gazeX = lerp(anim.gazeX, anim.targetGazeX, GAZE_CONFIG.smoothing + delayFactor * 0.05);
        gazeY = lerp(anim.gazeY, anim.targetGazeY, GAZE_CONFIG.smoothing + delayFactor * 0.05);

        // Recover from overshoot
        if (Math.abs(gazeX - targetX) < 0.01 && Math.abs(anim.targetGazeX - targetX) > 0.01) {
          anim.targetGazeX = lerp(anim.targetGazeX, targetX, GAZE_CONFIG.overshootRecovery);
        }
        if (Math.abs(gazeY - targetY) < 0.01 && Math.abs(anim.targetGazeY - targetY) > 0.01) {
          anim.targetGazeY = lerp(anim.targetGazeY, targetY, GAZE_CONFIG.overshootRecovery);
        }
      } else {
        // Idle wander
        anim.idleWanderTimer += delta;

        if (anim.idleWanderTimer > randomInRange(
          GAZE_CONFIG.idleWander.interval.min,
          GAZE_CONFIG.idleWander.interval.max
        )) {
          anim.idleWanderTimer = 0;
          anim.idleWanderTargetX = (Math.random() - 0.5) * 2 * GAZE_CONFIG.idleWander.range.x;
          anim.idleWanderTargetY = (Math.random() - 0.5) * 2 * GAZE_CONFIG.idleWander.range.y;
        }

        gazeX = lerp(anim.gazeX, anim.idleWanderTargetX, 0.02);
        gazeY = lerp(anim.gazeY, anim.idleWanderTargetY, 0.02);
      }

      anim.gazeX = gazeX;
      anim.gazeY = gazeY;

      // ========== GLOW ==========
      anim.glowIntensity = lerp(anim.glowIntensity, anim.targetGlowIntensity, 0.05);

      // ========== PULSE / RING ==========
      let pulseValue = 0;
      let ringPulse = 0;

      if (params.additionalEffects?.pulse) {
        const freq = params.additionalEffects.pulse.frequency;
        const amp = params.additionalEffects.pulse.amplitude;
        pulseValue = (Math.sin(now / 1000 * freq * Math.PI * 2) * 0.5 + 0.5) * amp;
      }

      if (params.additionalEffects?.ring) {
        ringPulse = (Math.sin(now / 1000 * 1.5 * Math.PI * 2) * 0.5 + 0.5);
      }

      anim.ringPulse = ringPulse;

      // ========== UPDATE STATE ==========
      setValues({
        blinkScale,
        breathScale,
        breathOpacity,
        gazeOffset: { x: gazeX, y: gazeY },
        glowIntensity: anim.glowIntensity,
        glowColor: params.additionalEffects?.glow?.color || "rgba(255, 255, 255, 0.1)",
        pulseValue,
        showParticles: params.additionalEffects?.particles || false,
        showRing: params.additionalEffects?.ring || false,
        ringPulse,
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [state, params, mousePosition]);

  return values;
}
