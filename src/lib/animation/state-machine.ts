/**
 * Avatar State Machine
 *
 * Core state machine implementation for managing avatar animation states.
 * Handles state transitions, guards, and listener notifications.
 */

import type {
  AvatarState,
  AvatarEvent,
  StateContext,
  StateChangeListener,
  IStateMachine,
} from "./types";
import { findTransition } from "./transitions";

/**
 * Create initial state context
 */
function createInitialContext(): StateContext {
  return {
    previousState: "IDLE",
    enteredAt: Date.now(),
    errorMessage: undefined,
    confirmationPrompt: undefined,
    speakingEndTime: undefined,
  };
}

/**
 * Avatar State Machine Implementation
 *
 * Manages the avatar's animation state with support for:
 * - State transitions with guards
 * - Event-driven state changes
 * - Listener notifications
 * - Force state (for debugging/demo)
 */
export class AvatarStateMachine implements IStateMachine {
  private state: AvatarState = "IDLE";
  private context: StateContext;
  private listeners: Set<StateChangeListener> = new Set();
  private lingeringTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(initialState: AvatarState = "IDLE") {
    this.state = initialState;
    this.context = createInitialContext();
    this.context.previousState = initialState;
  }

  /**
   * Get current state
   */
  getState(): AvatarState {
    return this.state;
  }

  /**
   * Get current context
   */
  getContext(): StateContext {
    return { ...this.context };
  }

  /**
   * Dispatch an event to trigger a state transition
   * Returns true if transition occurred, false otherwise
   */
  dispatch(event: AvatarEvent): boolean {
    const transition = findTransition(this.state, event);

    if (!transition) {
      // No valid transition for this event
      return false;
    }

    // Check guard if present
    if (transition.guard && !transition.guard(this.context)) {
      return false;
    }

    // Update context based on event
    const updatedContext = this.updateContextForEvent(event);

    // Perform transition
    const previousState = this.state;
    this.state = transition.to;
    this.context = {
      ...updatedContext,
      previousState,
      enteredAt: Date.now(),
    };

    // Handle special post-transition logic
    this.handlePostTransition(previousState, this.state, event);

    // Notify listeners
    this.notifyListeners(previousState);

    return true;
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Force state change (for debugging/demo)
   * Bypasses normal transition rules
   */
  forceState(state: AvatarState): void {
    const previousState = this.state;
    this.state = state;
    this.context = {
      ...this.context,
      previousState,
      enteredAt: Date.now(),
    };
    this.notifyListeners(previousState);
  }

  /**
   * Update context based on event type
   */
  private updateContextForEvent(event: AvatarEvent): StateContext {
    const newContext = { ...this.context };

    switch (event.type) {
      case "ERROR_OCCURRED":
        newContext.errorMessage = event.payload;
        break;

      case "CONFIRMATION_REQUIRED":
        newContext.confirmationPrompt = event.payload;
        break;

      case "TTS_END":
        newContext.speakingEndTime = Date.now();
        break;

      case "ERROR_DISMISSED":
        newContext.errorMessage = undefined;
        break;

      case "CONFIRMATION_RECEIVED":
        newContext.confirmationPrompt = undefined;
        break;
    }

    return newContext;
  }

  /**
   * Handle special logic after a transition
   */
  private handlePostTransition(
    fromState: AvatarState,
    toState: AvatarState,
    event: AvatarEvent
  ): void {
    // Clear any pending lingering timeout
    if (this.lingeringTimeoutId) {
      clearTimeout(this.lingeringTimeoutId);
      this.lingeringTimeoutId = null;
    }

    // Handle SPEAKING -> IDLE lingering effect
    if (fromState === "SPEAKING" && toState === "IDLE") {
      // The transition already happened, context has speakingEndTime
    }

    // Handle entering SPEAKING state - prepare for TTS end
    if (toState === "SPEAKING" && event.type === "TTS_START") {
      // Reset speaking end time
      this.context.speakingEndTime = undefined;
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(previousState: AvatarState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, this.context, previousState);
      } catch (error) {
        console.error("State change listener error:", error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.lingeringTimeoutId) {
      clearTimeout(this.lingeringTimeoutId);
      this.lingeringTimeoutId = null;
    }
    this.listeners.clear();
  }
}

/**
 * Create a new state machine instance
 */
export function createStateMachine(
  initialState: AvatarState = "IDLE"
): AvatarStateMachine {
  return new AvatarStateMachine(initialState);
}
