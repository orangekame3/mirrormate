"use client";

/**
 * useAvatarState Hook
 *
 * React hook that wraps the AvatarStateMachine for use in components.
 * Provides reactive state updates and event dispatching.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AvatarStateMachine,
  createStateMachine,
  type AvatarState,
  type AvatarEvent,
  type StateContext,
} from "@/lib/animation";

export interface UseAvatarStateReturn {
  /** Current avatar state */
  state: AvatarState;
  /** Current state context */
  context: StateContext;
  /** Dispatch an event to trigger state transition */
  dispatch: (event: AvatarEvent) => boolean;
  /** Force a state change (bypasses transition rules) */
  forceState: (state: AvatarState) => void;
  /** Time spent in current state (ms) */
  timeInState: number;
  /** Previous state before current */
  previousState: AvatarState;
}

/**
 * Hook for managing avatar animation state
 *
 * @param initialState - Initial state (default: IDLE)
 * @returns State management interface
 *
 * @example
 * ```tsx
 * const { state, dispatch, timeInState } = useAvatarState();
 *
 * // Dispatch an event
 * dispatch({ type: "MIC_ACTIVATED" });
 *
 * // Check current state
 * if (state === "LISTENING") {
 *   // Show listening indicator
 * }
 * ```
 */
export function useAvatarState(
  initialState: AvatarState = "IDLE"
): UseAvatarStateReturn {
  // State machine reference
  const machineRef = useRef<AvatarStateMachine | null>(null);

  // Reactive state
  const [state, setState] = useState<AvatarState>(initialState);
  const [context, setContext] = useState<StateContext>({
    previousState: initialState,
    enteredAt: Date.now(),
  });
  const [timeInState, setTimeInState] = useState(0);

  // Initialize state machine
  useEffect(() => {
    const machine = createStateMachine(initialState);
    machineRef.current = machine;

    // Subscribe to state changes
    const unsubscribe = machine.subscribe((newState, newContext, prevState) => {
      setState(newState);
      setContext(newContext);
    });

    // Update initial state
    setState(machine.getState());
    setContext(machine.getContext());

    return () => {
      unsubscribe();
      machine.destroy();
      machineRef.current = null;
    };
  }, [initialState]);

  // Update time in state periodically
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setTimeInState(Date.now() - context.enteredAt);
    }, 100);

    return () => clearInterval(updateInterval);
  }, [context.enteredAt]);

  // Dispatch event
  const dispatch = useCallback((event: AvatarEvent): boolean => {
    if (!machineRef.current) {
      console.warn("State machine not initialized");
      return false;
    }
    return machineRef.current.dispatch(event);
  }, []);

  // Force state change
  const forceState = useCallback((newState: AvatarState): void => {
    if (!machineRef.current) {
      console.warn("State machine not initialized");
      return;
    }
    machineRef.current.forceState(newState);
  }, []);

  return {
    state,
    context,
    dispatch,
    forceState,
    timeInState,
    previousState: context.previousState,
  };
}
