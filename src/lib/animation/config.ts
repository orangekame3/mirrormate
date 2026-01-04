/**
 * Animation Configuration
 *
 * Centralized configuration for all animation timing, effects, and parameters.
 * All timing values are in milliseconds.
 */

import type { StateAnimationParams, ParticleConfig, RingConfig, AvatarState } from "./types";

// Response timing configuration
export const TIMING_CONFIG = {
  // Maximum acceptable response delay (ms)
  maxResponseDelay: 150,

  // Lingering effect duration after speaking ends
  lingeringDuration: 2000,

  // Threshold to show "still processing" pulse in THINKING state
  longThinkingThreshold: 5000,

  // Error state auto-dismiss delay
  errorAutoDismiss: 3000,

  // Sleep mode burn-in prevention shift interval
  sleepShiftInterval: 90000, // 90 seconds
  sleepShiftAmount: 2, // pixels
} as const;

// Performance configuration
export const PERFORMANCE_CONFIG = {
  targetFPS: 30,
  frameInterval: 1000 / 30, // ~33ms
  maxFPS: 60,
} as const;

// Gaze tracking configuration
export const GAZE_CONFIG = {
  // Maximum gaze offset from center
  maxOffset: { x: 0.3, y: 0.2 },

  // Smoothing factor for gaze interpolation (lower = smoother)
  smoothing: 0.05,

  // Idle wander settings (when not tracking user)
  idleWander: {
    interval: { min: 3000, max: 5000 },
    range: { x: 0.15, y: 0.1 },
  },

  // Default easing for gaze movement
  overshootRecovery: 0.08,
} as const;

// Particle configuration for THINKING state
export const PARTICLE_CONFIG: ParticleConfig = {
  count: 8,
  radius: 0.6,
  speed: 0.3,
  color: "rgba(255, 255, 255, 0.4)",
  opacity: 0.4,
} as const;

// Ring configuration for LISTENING state
export const RING_CONFIG: RingConfig = {
  radius: 0.8,
  thickness: 0.02,
  color: "rgba(255, 255, 255, 0.3)",
  pulseAmplitude: 0.05,
  pulseFrequency: 1.5,
} as const;

// Animation parameters per state
export const STATE_ANIMATION_PARAMS: Record<AvatarState, StateAnimationParams> = {
  IDLE: {
    blinkInterval: { min: 8000, max: 14000 },
    breathingCycle: { min: 5500, max: 6500 },
    breathingAmplitude: { scale: 0.015, opacity: 0.01 },
    gazeTracking: false,
    gazeDelay: 0,
    gazeOvershoot: 1.0,
  },

  AWARE: {
    blinkInterval: { min: 6000, max: 10000 },
    breathingCycle: { min: 4500, max: 5500 },
    breathingAmplitude: { scale: 0.018, opacity: 0.015 },
    gazeTracking: true,
    gazeDelay: 250,
    gazeOvershoot: 1.12,
    // No visual effects - state expressed through gaze tracking and breathing
  },

  LISTENING: {
    blinkInterval: { min: 4000, max: 8000 },
    breathingCycle: { min: 4000, max: 5000 },
    breathingAmplitude: { scale: 0.02, opacity: 0.02 },
    gazeTracking: true,
    gazeDelay: 200,
    gazeOvershoot: 1.15,
    // No visual effects - state expressed through blink frequency and breathing
  },

  THINKING: {
    blinkInterval: { min: 3000, max: 6000 },
    breathingCycle: { min: 3500, max: 4500 },
    breathingAmplitude: { scale: 0.02, opacity: 0.02 },
    gazeTracking: false, // Internal focus
    gazeDelay: 0,
    gazeOvershoot: 1.0,
    // No particles - state expressed through blink frequency and slight head tilt
  },

  SPEAKING: {
    blinkInterval: { min: 4000, max: 8000 },
    breathingCycle: { min: 4000, max: 5000 },
    breathingAmplitude: { scale: 0.018, opacity: 0.015 },
    gazeTracking: true,
    gazeDelay: 300,
    gazeOvershoot: 1.08,
  },

  CONFIRMING: {
    blinkInterval: { min: 5000, max: 9000 },
    breathingCycle: { min: 4500, max: 5500 },
    breathingAmplitude: { scale: 0.02, opacity: 0.02 },
    gazeTracking: true,
    gazeDelay: 200,
    gazeOvershoot: 1.1,
    // No pulse - state expressed through gaze and breathing
  },

  ERROR: {
    blinkInterval: { min: 6000, max: 10000 },
    breathingCycle: { min: 5000, max: 6000 },
    breathingAmplitude: { scale: 0.015, opacity: 0.01 },
    gazeTracking: false,
    gazeDelay: 0,
    gazeOvershoot: 1.0,
    // No glow - error expressed through other means (text, etc.)
  },

  SLEEP: {
    blinkInterval: { min: 15000, max: 25000 },
    breathingCycle: { min: 7000, max: 9000 },
    breathingAmplitude: { scale: 0.01, opacity: 0.005 },
    gazeTracking: false,
    gazeDelay: 0,
    gazeOvershoot: 1.0,
  },
} as const;

// Transition animation durations
export const TRANSITION_DURATIONS = {
  default: 300,

  stateEnter: {
    IDLE: 500,
    AWARE: 400,
    LISTENING: 200,
    THINKING: 150,
    SPEAKING: 100,
    CONFIRMING: 300,
    ERROR: 400,
    SLEEP: 800,
  } as Record<AvatarState, number>,

  stateExit: {
    IDLE: 200,
    AWARE: 300,
    LISTENING: 200,
    THINKING: 200,
    SPEAKING: 2000, // Lingering effect
    CONFIRMING: 200,
    ERROR: 300,
    SLEEP: 600,
  } as Record<AvatarState, number>,
} as const;

// Utility function: Get random value in range with normal-like distribution
export function randomInRange(min: number, max: number): number {
  // Use Box-Muller transform for more natural distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  // Map to range with standard deviation of 0.25 range
  const range = max - min;
  const center = (max + min) / 2;
  const value = center + normal * (range / 4);
  return Math.max(min, Math.min(max, value));
}

// Utility function: Ease in out cubic
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Utility function: Linear interpolation
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Utility function: Clamp value
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
