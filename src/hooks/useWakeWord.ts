"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type WakeWordMode = "waiting" | "conversation";

interface WakeWordConfig {
  enabled: boolean;
  phrase: string;
  timeout: number;
}

interface UseWakeWordOptions {
  onWakeWordDetected?: () => void;
  onTimeout?: () => void;
}

interface UseWakeWordReturn {
  mode: WakeWordMode;
  config: WakeWordConfig | null;
  isEnabled: boolean;
  checkForWakeWord: (transcript: string) => boolean;
  startConversation: () => void;
  endConversation: () => void;
  resetTimeout: () => void;
}

export function useWakeWord({
  onWakeWordDetected,
  onTimeout,
}: UseWakeWordOptions = {}): UseWakeWordReturn {
  const [mode, setMode] = useState<WakeWordMode>("waiting");
  const [config, setConfig] = useState<WakeWordConfig | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wake word config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/wakeword");
        if (res.ok) {
          const data: WakeWordConfig = await res.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("[WakeWord] Failed to fetch config:", error);
        // Use default config
        setConfig({ enabled: false, phrase: "Hey Mira", timeout: 15 });
      }
    }
    fetchConfig();
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Start conversation timeout
  const startConversationTimeout = useCallback(() => {
    if (!config) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log("[WakeWord] Conversation timeout, returning to waiting mode");
      setMode("waiting");
      onTimeout?.();
    }, config.timeout * 1000);
  }, [config, onTimeout]);

  // Check if transcript contains wake word
  const checkForWakeWord = useCallback(
    (transcript: string): boolean => {
      if (!config?.enabled || mode !== "waiting") {
        return false;
      }

      // Normalize both strings for comparison
      const normalizedTranscript = transcript.toLowerCase().replace(/\s+/g, "");
      const normalizedPhrase = config.phrase.toLowerCase().replace(/\s+/g, "");

      // Check if wake word is in transcript
      if (normalizedTranscript.includes(normalizedPhrase)) {
        console.log("[WakeWord] Wake word detected!");
        setMode("conversation");
        startConversationTimeout();
        onWakeWordDetected?.();
        return true;
      }

      return false;
    },
    [config, mode, startConversationTimeout, onWakeWordDetected]
  );

  // Manually start conversation mode
  const startConversation = useCallback(() => {
    setMode("conversation");
    startConversationTimeout();
  }, [startConversationTimeout]);

  // End conversation and return to waiting
  const endConversation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMode("waiting");
  }, []);

  // Reset timeout (call when user speaks)
  const resetTimeout = useCallback(() => {
    if (mode === "conversation") {
      startConversationTimeout();
    }
  }, [mode, startConversationTimeout]);

  return {
    mode,
    config,
    isEnabled: config?.enabled ?? false,
    checkForWakeWord,
    startConversation,
    endConversation,
    resetTimeout,
  };
}
