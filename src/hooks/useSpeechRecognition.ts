"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onResult,
  onInterimResult,
  lang = "ja-JP",
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(true);
  const isListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttempts = 5;
  const restartDelayRef = useRef(100);

  // Use refs for callbacks to avoid recreating recognition instance
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);

  // Update refs when callbacks change
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("[SpeechRecognition] Not supported in this browser");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      console.log("[SpeechRecognition] Started listening");
      isListeningRef.current = true;
      setIsListening(true);
      // Reset restart attempts on successful start
      restartAttemptsRef.current = 0;
      restartDelayRef.current = 100;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterimResultRef.current) {
        onInterimResultRef.current(interimTranscript);
      }

      if (finalTranscript) {
        console.log("[SpeechRecognition] Final result:", finalTranscript);
        onResultRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Handle different error types
      switch (event.error) {
        case "not-allowed":
          console.error("[SpeechRecognition] Microphone permission denied");
          shouldRestartRef.current = false;
          break;
        case "network":
          // Network errors are transient, just log as warning and let it retry
          console.warn("[SpeechRecognition] Network error - will retry");
          break;
        case "no-speech":
          // No speech detected is not really an error, reset attempts
          console.log("[SpeechRecognition] No speech detected");
          restartAttemptsRef.current = 0;
          break;
        case "aborted":
          // Aborted by user/code, not an error
          console.log("[SpeechRecognition] Aborted");
          break;
        case "audio-capture":
          // Microphone not available
          console.error("[SpeechRecognition] Audio capture failed");
          break;
        default:
          console.error("[SpeechRecognition] Error:", event.error);
      }
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Ended");
      isListeningRef.current = false;
      setIsListening(false);

      // Auto restart with exponential backoff
      if (shouldRestartRef.current) {
        if (restartAttemptsRef.current >= maxRestartAttempts) {
          console.warn("[SpeechRecognition] Max restart attempts reached, waiting longer...");
          // Reset attempts but use longer delay
          restartAttemptsRef.current = 0;
          restartDelayRef.current = 2000;
        }

        const delay = restartDelayRef.current;
        restartAttemptsRef.current++;

        console.log(`[SpeechRecognition] Restarting in ${delay}ms (attempt ${restartAttemptsRef.current})...`);

        setTimeout(() => {
          if (shouldRestartRef.current && !isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.log("[SpeechRecognition] Already running, skip restart");
            }
          }
        }, delay);

        // Increase delay for next attempt (exponential backoff, max 2s)
        restartDelayRef.current = Math.min(restartDelayRef.current * 1.5, 2000);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, [lang]); // Only depend on lang, not callbacks

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;

    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started - ignore
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;

    shouldRestartRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped - ignore
    }
  }, []);

  const pause = useCallback(() => {
    if (!recognitionRef.current || !isListeningRef.current) return;

    shouldRestartRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped - ignore
    }
  }, []);

  const resume = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;

    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started - ignore
    }
  }, []);

  return {
    isListening,
    isSupported,
    start,
    stop,
    pause,
    resume,
  };
}
