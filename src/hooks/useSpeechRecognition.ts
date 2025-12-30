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
      console.error("[SpeechRecognition] Error:", event.error);

      if (event.error === "not-allowed") {
        console.error("[SpeechRecognition] Microphone permission denied");
        shouldRestartRef.current = false;
      }
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Ended");
      setIsListening(false);

      // 自動再開（エラーでない場合）
      if (shouldRestartRef.current) {
        console.log("[SpeechRecognition] Restarting...");
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("[SpeechRecognition] Failed to restart:", e);
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
    if (!recognitionRef.current || isListening) return;

    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started - ignore
    }
  }, [isListening]);

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
    if (!recognitionRef.current || !isListening) return;

    shouldRestartRef.current = false;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Already stopped - ignore
    }
  }, [isListening]);

  const resume = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    shouldRestartRef.current = true;
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started - ignore
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    start,
    stop,
    pause,
    resume,
  };
}
