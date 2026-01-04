/**
 * State Transitions
 *
 * Defines the transition matrix for the avatar state machine.
 * Each transition specifies: from state(s), triggering event, target state, and optional guard.
 */

import type { StateTransition, AvatarState, AvatarEvent } from "./types";
import { TIMING_CONFIG } from "./config";

/**
 * State transition definitions.
 * Order matters - first matching transition will be used.
 */
export const STATE_TRANSITIONS: StateTransition[] = [
  // ============================================
  // IDLE transitions
  // ============================================

  // Mic activation triggers AWARE -> LISTENING flow
  {
    from: "IDLE",
    event: "MIC_ACTIVATED",
    to: "AWARE",
  },

  // Direct to sleep mode
  {
    from: "IDLE",
    event: "SLEEP_TIMER",
    to: "SLEEP",
  },

  // User detection (future expansion)
  {
    from: "IDLE",
    event: "USER_DETECTED",
    to: "AWARE",
  },

  // ============================================
  // AWARE transitions
  // ============================================

  // Audio input starts listening
  {
    from: "AWARE",
    event: "AUDIO_INPUT_START",
    to: "LISTENING",
  },

  // Mic stays on, transition to listening
  {
    from: "AWARE",
    event: "MIC_ACTIVATED",
    to: "LISTENING",
  },

  // User lost, return to idle
  {
    from: "AWARE",
    event: "USER_LOST",
    to: "IDLE",
  },

  // Mic turned off
  {
    from: "AWARE",
    event: "MIC_DEACTIVATED",
    to: "IDLE",
  },

  // Sleep timer
  {
    from: "AWARE",
    event: "SLEEP_TIMER",
    to: "SLEEP",
  },

  // ============================================
  // LISTENING transitions
  // ============================================

  // Start processing (user finished speaking)
  {
    from: "LISTENING",
    event: "PROCESSING_START",
    to: "THINKING",
  },

  // Mic turned off during listening
  {
    from: "LISTENING",
    event: "MIC_DEACTIVATED",
    to: "IDLE",
  },

  // Error during listening
  {
    from: "LISTENING",
    event: "ERROR_OCCURRED",
    to: "ERROR",
  },

  // ============================================
  // THINKING transitions
  // ============================================

  // TTS starts - begin speaking
  {
    from: "THINKING",
    event: "TTS_START",
    to: "SPEAKING",
  },

  // Confirmation required
  {
    from: "THINKING",
    event: "CONFIRMATION_REQUIRED",
    to: "CONFIRMING",
  },

  // Error during processing
  {
    from: "THINKING",
    event: "ERROR_OCCURRED",
    to: "ERROR",
  },

  // Processing ended without TTS (quick response)
  {
    from: "THINKING",
    event: "PROCESSING_END",
    to: "IDLE",
  },

  // ============================================
  // SPEAKING transitions
  // ============================================

  // TTS ended - return to idle with lingering guard
  {
    from: "SPEAKING",
    event: "TTS_END",
    to: "IDLE",
    guard: (context) => {
      // Allow transition only after lingering duration
      const timeSinceEnd = Date.now() - (context.speakingEndTime || Date.now());
      return timeSinceEnd >= TIMING_CONFIG.lingeringDuration;
    },
  },

  // Immediate transition when lingering is not needed (for forced transitions)
  {
    from: "SPEAKING",
    event: "PROCESSING_START",
    to: "THINKING",
  },

  // Error during speaking
  {
    from: "SPEAKING",
    event: "ERROR_OCCURRED",
    to: "ERROR",
  },

  // Mic activated during speaking - prepare for next input
  {
    from: "SPEAKING",
    event: "MIC_ACTIVATED",
    to: "SPEAKING", // Stay in speaking, will transition after TTS ends
  },

  // ============================================
  // CONFIRMING transitions
  // ============================================

  // Confirmation received - back to thinking
  {
    from: "CONFIRMING",
    event: "CONFIRMATION_RECEIVED",
    to: "THINKING",
  },

  // Error during confirmation
  {
    from: "CONFIRMING",
    event: "ERROR_OCCURRED",
    to: "ERROR",
  },

  // User cancelled (mic off)
  {
    from: "CONFIRMING",
    event: "MIC_DEACTIVATED",
    to: "IDLE",
  },

  // ============================================
  // ERROR transitions
  // ============================================

  // Error dismissed - return to idle
  {
    from: "ERROR",
    event: "ERROR_DISMISSED",
    to: "IDLE",
  },

  // User activity during error - acknowledge and return
  {
    from: "ERROR",
    event: "USER_DETECTED",
    to: "AWARE",
  },

  // Mic activation during error
  {
    from: "ERROR",
    event: "MIC_ACTIVATED",
    to: "AWARE",
  },

  // ============================================
  // SLEEP transitions
  // ============================================

  // Wake up
  {
    from: "SLEEP",
    event: "WAKE",
    to: "IDLE",
  },

  // User detected while sleeping
  {
    from: "SLEEP",
    event: "USER_DETECTED",
    to: "AWARE",
  },

  // Mic activated while sleeping
  {
    from: "SLEEP",
    event: "MIC_ACTIVATED",
    to: "AWARE",
  },
];

/**
 * Find a matching transition for the given state and event.
 * Returns undefined if no valid transition exists.
 */
export function findTransition(
  currentState: AvatarState,
  event: AvatarEvent
): StateTransition | undefined {
  return STATE_TRANSITIONS.find((transition) => {
    // Check if 'from' matches current state
    const fromStates = Array.isArray(transition.from)
      ? transition.from
      : [transition.from];

    if (!fromStates.includes(currentState)) {
      return false;
    }

    // Check if event type matches
    return transition.event === event.type;
  });
}

/**
 * Get all valid events for a given state.
 * Useful for debugging and validation.
 */
export function getValidEventsForState(state: AvatarState): AvatarEvent["type"][] {
  const events = new Set<AvatarEvent["type"]>();

  STATE_TRANSITIONS.forEach((transition) => {
    const fromStates = Array.isArray(transition.from)
      ? transition.from
      : [transition.from];

    if (fromStates.includes(state)) {
      events.add(transition.event);
    }
  });

  return Array.from(events);
}

/**
 * Validate that the transition graph is complete.
 * Returns any states that have no exit transitions.
 */
export function validateTransitionGraph(): AvatarState[] {
  const allStates: AvatarState[] = [
    "IDLE",
    "AWARE",
    "LISTENING",
    "THINKING",
    "SPEAKING",
    "CONFIRMING",
    "ERROR",
    "SLEEP",
  ];

  const statesWithNoExits: AvatarState[] = [];

  allStates.forEach((state) => {
    const exits = getValidEventsForState(state);
    if (exits.length === 0) {
      statesWithNoExits.push(state);
    }
  });

  return statesWithNoExits;
}
