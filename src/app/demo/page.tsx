"use client";

import { useState, useEffect, useCallback } from "react";
import SimpleAvatar from "@/components/SimpleAvatar";
import { useAvatarState } from "@/hooks/useAvatarState";
import { useAnimationController } from "@/hooks/useAnimationController";
import { useLongThinkingPulse } from "@/hooks/useLongThinkingPulse";
import type { AvatarState } from "@/lib/animation";

const STATE_KEYS: Record<string, AvatarState> = {
  "1": "IDLE",
  "2": "AWARE",
  "3": "LISTENING",
  "4": "THINKING",
  "5": "SPEAKING",
  "6": "CONFIRMING",
  "7": "ERROR",
  "8": "SLEEP",
};

const STATE_DESCRIPTIONS: Record<AvatarState, string> = {
  IDLE: "Idle + low-frequency blink/breathing",
  AWARE: "User detected, subtle highlight",
  LISTENING: "Voice input active",
  THINKING: "Processing, internal focus",
  SPEAKING: "Responding, lip-sync active",
  CONFIRMING: "Awaiting confirmation",
  ERROR: "Error state (non-aggressive)",
  SLEEP: "Sleep mode",
};

export default function AnimationDemoPage() {
  const { state, context, forceState, timeInState, previousState } = useAvatarState();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const animationParams = useAnimationController(state, context, { mousePosition });
  const { showPulse: showLongThinkingPulse, pulseCount } = useLongThinkingPulse(state, context);

  // Track mouse for gaze
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetState = STATE_KEYS[e.key];
      if (targetState) {
        forceState(targetState);
      }

      // Space bar for mouth animation test
      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
        setMouthOpenness(0.8);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setMouthOpenness(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [forceState]);

  // Format time in state
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <main className="h-screen w-screen bg-black flex flex-col overflow-hidden relative">
      {/* State indicator - Top Left */}
      <div className="absolute top-4 left-4 text-white/60 font-mono text-sm z-10">
        <div className="mb-2">
          Current: <span className="text-white font-bold">{state}</span>
        </div>
        <div className="text-white/40 text-xs mb-1">
          {STATE_DESCRIPTIONS[state]}
        </div>
        <div className="text-white/40 text-xs">
          Time: {formatTime(timeInState)}
        </div>
        <div className="text-white/40 text-xs">
          Previous: {previousState}
        </div>
        {showLongThinkingPulse && (
          <div className="text-yellow-400/80 text-xs mt-2 animate-pulse">
            Long thinking... (pulse #{pulseCount})
          </div>
        )}
      </div>

      {/* Keyboard legend - Top Right */}
      <div className="absolute top-4 right-4 text-white/40 font-mono text-xs z-10">
        <div className="mb-2 text-white/60">Keyboard Controls</div>
        {Object.entries(STATE_KEYS).map(([key, stateName]) => (
          <div
            key={key}
            className={`py-0.5 ${state === stateName ? "text-white" : ""}`}
          >
            [{key}] {stateName}
          </div>
        ))}
        <div className="mt-3 border-t border-white/10 pt-2">
          <div className={isSpacePressed ? "text-green-400" : ""}>
            [Space] Mouth test
          </div>
        </div>
      </div>

      {/* Avatar - Center */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[600px] h-[600px]">
          <SimpleAvatar
            isSpeaking={state === "SPEAKING" || isSpacePressed}
            isThinking={state === "THINKING"}
            mouthOpenness={mouthOpenness}
            avatarState={state}
            animationParams={animationParams}
          />
        </div>
      </div>

      {/* Animation parameters debug panel - Bottom Left */}
      <div className="absolute bottom-4 left-4 text-white/40 font-mono text-xs z-10 bg-black/50 p-3 rounded">
        <div className="mb-2 text-white/60">Animation Values</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div>Blink Scale:</div>
          <div className="text-white/60">{animationParams.blinkScale.toFixed(3)}</div>
          <div>Breath Scale:</div>
          <div className="text-white/60">{animationParams.breathScale.toFixed(4)}</div>
          <div>Gaze X:</div>
          <div className="text-white/60">{animationParams.gazeOffset.x.toFixed(3)}</div>
          <div>Gaze Y:</div>
          <div className="text-white/60">{animationParams.gazeOffset.y.toFixed(3)}</div>
          <div>Glow:</div>
          <div className="text-white/60">{animationParams.glowIntensity.toFixed(3)}</div>
          <div>Pulse:</div>
          <div className="text-white/60">{animationParams.pulseValue.toFixed(3)}</div>
          <div>Ring:</div>
          <div className="text-white/60">{animationParams.showRing ? `ON (${animationParams.ringPulse.toFixed(2)})` : "OFF"}</div>
          <div>Particles:</div>
          <div className="text-white/60">{animationParams.showParticles ? "ON" : "OFF"}</div>
        </div>
      </div>

      {/* Mouse position - Bottom Right */}
      <div className="absolute bottom-4 right-4 text-white/40 font-mono text-xs z-10">
        <div>
          Mouse: ({mousePosition.x.toFixed(2)}, {mousePosition.y.toFixed(2)})
        </div>
      </div>

      {/* State transition visualization */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {(Object.keys(STATE_KEYS) as string[]).map((key) => {
          const stateName = STATE_KEYS[key];
          const isActive = state === stateName;
          return (
            <button
              key={key}
              onClick={() => forceState(stateName)}
              className={`
                px-3 py-1.5 rounded text-xs font-mono transition-all duration-200
                ${isActive
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/50 hover:bg-white/20"
                }
              `}
            >
              {stateName}
            </button>
          );
        })}
      </div>
    </main>
  );
}
