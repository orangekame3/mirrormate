/**
 * BroadcastChannel Adapter
 *
 * Maps existing BroadcastChannel messages to state machine events.
 * This allows seamless integration with the existing control panel communication.
 */

import type { AvatarEvent } from "./types";

// Existing BroadcastMessage type from page.tsx
export interface BroadcastMessage {
  type:
    | "speaking_start"
    | "speaking_end"
    | "thinking_start"
    | "thinking_end"
    | "response"
    | "play_audio"
    | "user_message"
    | "mic_start"
    | "mic_stop"
    | "mic_status"
    | "mic_request_status"
    | "effect"
    // New animation state types
    | "avatar_state_change"
    | "user_presence"
    | "confirmation_request"
    | "confirmation_response"
    | "error_event"
    | "sleep_wake";
  payload?: string;
}

/**
 * Map a BroadcastChannel message to an AvatarEvent.
 * Returns null if the message doesn't map to any event.
 */
export function mapBroadcastToEvent(message: BroadcastMessage): AvatarEvent | null {
  switch (message.type) {
    // Microphone controls
    case "mic_start":
      return { type: "MIC_ACTIVATED" };

    case "mic_stop":
      return { type: "MIC_DEACTIVATED" };

    // Thinking/Processing
    case "thinking_start":
      return { type: "PROCESSING_START" };

    case "thinking_end":
      return { type: "PROCESSING_END" };

    // Speaking
    case "speaking_start":
      return { type: "TTS_START" };

    case "speaking_end":
      return { type: "TTS_END" };

    // New event types
    case "user_presence":
      return message.payload === "detected"
        ? { type: "USER_DETECTED" }
        : { type: "USER_LOST" };

    case "error_event":
      return message.payload
        ? { type: "ERROR_OCCURRED", payload: message.payload }
        : { type: "ERROR_DISMISSED" };

    case "sleep_wake":
      return message.payload === "sleep"
        ? { type: "SLEEP_TIMER" }
        : { type: "WAKE" };

    case "confirmation_request":
      return message.payload
        ? { type: "CONFIRMATION_REQUIRED", payload: message.payload }
        : null;

    case "confirmation_response":
      return { type: "CONFIRMATION_RECEIVED", payload: message.payload === "true" };

    // These messages don't map to state events
    case "response":
    case "play_audio":
    case "user_message":
    case "mic_status":
    case "mic_request_status":
    case "effect":
    case "avatar_state_change":
      return null;

    default:
      return null;
  }
}

/**
 * Create a BroadcastMessage for a state change.
 * This can be used to sync state across windows/tabs.
 */
export function createStateChangeBroadcast(
  state: string,
  previousState: string
): BroadcastMessage {
  return {
    type: "avatar_state_change",
    payload: JSON.stringify({ state, previousState }),
  };
}

/**
 * Helper to check if a message type affects animation state
 */
export function isAnimationRelevantMessage(type: BroadcastMessage["type"]): boolean {
  return [
    "mic_start",
    "mic_stop",
    "thinking_start",
    "thinking_end",
    "speaking_start",
    "speaking_end",
    "user_presence",
    "error_event",
    "sleep_wake",
    "confirmation_request",
    "confirmation_response",
  ].includes(type);
}
