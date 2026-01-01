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

      if (interimTranscript && onInterimResult) {
        onInterimResult(interimTranscript);
      }

      if (finalTranscript) {
        console.log("[SpeechRecognition] Final result:", finalTranscript);
        onResult(finalTranscript);
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
          // No speech detected is not really an error
          console.log("[SpeechRecognition] No speech detected");
          break;
        case "aborted":
          // Aborted by user/code, not an error
          console.log("[SpeechRecognition] Aborted");
          break;
        default:
          console.error("[SpeechRecognition] Error:", event.error);
      }
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Ended");
      isListeningRef.current = false;
      setIsListening(false);

      // 自動再開（エラーでない場合、かつ現在リスニング中でない場合）
      if (shouldRestartRef.current && !isListeningRef.current) {
        console.log("[SpeechRecognition] Restarting...");
        setTimeout(() => {
          // 再度チェック（タイムアウト中に状態が変わる可能性があるため）
          if (shouldRestartRef.current && !isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // Already started - silently ignore
              console.log("[SpeechRecognition] Already running, skip restart");
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, [lang, onResult, onInterimResult]);

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
