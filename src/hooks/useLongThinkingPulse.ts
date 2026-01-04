"use client";

/**
 * useLongThinkingPulse Hook
 *
 * Returns a boolean that becomes true when the avatar has been
 * in THINKING state for longer than the threshold (5 seconds).
 * Shows "still processing" visual feedback.
 */

import { useState, useEffect } from "react";
import { type AvatarState, type StateContext, TIMING_CONFIG } from "@/lib/animation";

export interface UseLongThinkingPulseReturn {
  /** Whether to show long thinking indicator */
  showPulse: boolean;
  /** Number of pulses shown (increments every 5s) */
  pulseCount: number;
}

/**
 * Hook for detecting long thinking duration
 *
 * @param state - Current avatar state
 * @param context - Current state context
 * @returns Long thinking pulse state
 *
 * @example
 * ```tsx
 * const { showPulse, pulseCount } = useLongThinkingPulse(state, context);
 *
 * if (showPulse) {
 *   // Show "still processing" indicator
 * }
 * ```
 */
export function useLongThinkingPulse(
  state: AvatarState,
  context: StateContext
): UseLongThinkingPulseReturn {
  const [showPulse, setShowPulse] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  useEffect(() => {
    // Only track when in THINKING state
    if (state !== "THINKING") {
      setShowPulse(false);
      setPulseCount(0);
      return;
    }

    // Calculate initial delay based on when we entered THINKING
    const timeInState = Date.now() - context.enteredAt;
    const initialDelay = Math.max(0, TIMING_CONFIG.longThinkingThreshold - timeInState);

    // First pulse after threshold
    const firstTimer = setTimeout(() => {
      setShowPulse(true);
      setPulseCount(1);
    }, initialDelay);

    // Subsequent pulses every 5 seconds
    const pulseInterval = setInterval(() => {
      if (Date.now() - context.enteredAt >= TIMING_CONFIG.longThinkingThreshold) {
        setShowPulse(true);
        setPulseCount((prev) => prev + 1);

        // Auto-hide pulse after 1 second (shows as brief flash)
        setTimeout(() => setShowPulse(false), 1000);
      }
    }, TIMING_CONFIG.longThinkingThreshold);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(pulseInterval);
    };
  }, [state, context.enteredAt]);

  return { showPulse, pulseCount };
}
