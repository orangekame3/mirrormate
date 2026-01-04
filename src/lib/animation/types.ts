/**
 * Avatar Animation State Machine Types
 *
 * Defines all types for the animation state machine including states,
 * events, transitions, and animation parameters.
 */

// Avatar States
export type AvatarState =
  | "IDLE"
  | "AWARE"
  | "LISTENING"
  | "THINKING"
  | "SPEAKING"
  | "CONFIRMING"
  | "ERROR"
  | "SLEEP";

// Event types for state transitions
export type AvatarEvent =
  | { type: "USER_DETECTED" }
  | { type: "USER_LOST" }
  | { type: "MIC_ACTIVATED" }
  | { type: "MIC_DEACTIVATED" }
  | { type: "AUDIO_INPUT_START" }
  | { type: "AUDIO_INPUT_END" }
  | { type: "PROCESSING_START" }
  | { type: "PROCESSING_END" }
  | { type: "TTS_START" }
  | { type: "TTS_END" }
  | { type: "CONFIRMATION_REQUIRED"; payload: string }
  | { type: "CONFIRMATION_RECEIVED"; payload: boolean }
  | { type: "ERROR_OCCURRED"; payload: string }
  | { type: "ERROR_DISMISSED" }
  | { type: "SLEEP_TIMER" }
  | { type: "WAKE" };

// State context (mutable data associated with current state)
export interface StateContext {
  previousState: AvatarState;
  enteredAt: number;
  errorMessage?: string;
  confirmationPrompt?: string;
  speakingEndTime?: number;
}

// Transition guard function
export type TransitionGuard = (context: StateContext) => boolean;

// State transition definition
export interface StateTransition {
  from: AvatarState | AvatarState[];
  event: AvatarEvent["type"];
  to: AvatarState;
  guard?: TransitionGuard;
}

// Glow effect parameters
export interface GlowEffect {
  intensity: number;
  color: string;
}

// Pulse effect parameters
export interface PulseEffect {
  frequency: number;
  amplitude: number;
}

// Additional effects per state
export interface AdditionalEffects {
  glow?: GlowEffect;
  pulse?: PulseEffect;
  particles?: boolean;
  ring?: boolean;
}

// Animation parameters for each state
export interface StateAnimationParams {
  blinkInterval: { min: number; max: number }; // in milliseconds
  breathingCycle: { min: number; max: number }; // in milliseconds
  breathingAmplitude: { scale: number; opacity: number };
  gazeTracking: boolean;
  gazeDelay: number; // in milliseconds
  gazeOvershoot: number; // multiplier (e.g., 1.05 = 5% overshoot)
  additionalEffects?: AdditionalEffects;
}

// Real-time animation values output from controller
export interface AnimationValues {
  blinkScale: number; // 0 = closed, 1 = open
  breathScale: number; // Current breathing scale offset
  breathOpacity: number; // Current opacity offset
  gazeOffset: { x: number; y: number }; // Gaze offset from center
  glowIntensity: number; // 0-1 for glow effect
  glowColor: string; // Glow color
  pulseValue: number; // 0-1 for pulse effect
  showParticles: boolean; // Whether to show particles
  showRing: boolean; // Whether to show listening ring
  ringPulse: number; // Ring pulse value 0-1
}

// Particle configuration for THINKING state
export interface ParticleConfig {
  count: number;
  radius: number;
  speed: number;
  color: string;
  opacity: number;
}

// Ring configuration for LISTENING state
export interface RingConfig {
  radius: number;
  thickness: number;
  color: string;
  pulseAmplitude: number;
  pulseFrequency: number;
}

// State machine listener callback
export type StateChangeListener = (
  state: AvatarState,
  context: StateContext,
  previousState: AvatarState
) => void;

// State machine interface
export interface IStateMachine {
  getState(): AvatarState;
  getContext(): StateContext;
  dispatch(event: AvatarEvent): boolean;
  subscribe(listener: StateChangeListener): () => void;
  forceState(state: AvatarState): void;
}
