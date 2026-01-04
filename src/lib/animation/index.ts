/**
 * Animation Library
 *
 * Public exports for the avatar animation system.
 */

// Types
export type {
  AvatarState,
  AvatarEvent,
  StateContext,
  StateAnimationParams,
  AnimationValues,
  StateChangeListener,
  IStateMachine,
  GlowEffect,
  PulseEffect,
  AdditionalEffects,
  ParticleConfig,
  RingConfig,
} from "./types";

// State Machine
export { AvatarStateMachine, createStateMachine } from "./state-machine";

// Transitions
export {
  STATE_TRANSITIONS,
  findTransition,
  getValidEventsForState,
  validateTransitionGraph,
} from "./transitions";

// Configuration
export {
  TIMING_CONFIG,
  PERFORMANCE_CONFIG,
  GAZE_CONFIG,
  PARTICLE_CONFIG,
  RING_CONFIG,
  STATE_ANIMATION_PARAMS,
  TRANSITION_DURATIONS,
  randomInRange,
  easeInOutCubic,
  lerp,
  clamp,
} from "./config";
