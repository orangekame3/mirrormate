"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAudioRecorder } from "./useAudioRecorder";
import { STTClientConfig, SilenceDetectionConfig } from "@/lib/stt";

// Web Speech API types
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

/** Available speech recognition providers */
export type SpeechRecognitionProvider = "web" | "whisper";

interface UseSpeechRecognitionOptions {
  /** Called when a final transcript is received */
  onResult: (transcript: string) => void;
  /** Called with interim/partial transcripts (Web Speech only) */
  onInterimResult?: (transcript: string) => void;
  /** Called when recording state changes (Whisper mode) */
  onRecordingStateChange?: (isRecording: boolean) => void;
  /** Called with volume level for visualization (Whisper mode) */
  onVolumeChange?: (volume: number) => void;
  /** Language code (default: "ja-JP") */
  lang?: string;
  /** Override provider selection from config */
  provider?: SpeechRecognitionProvider;
}

interface UseSpeechRecognitionReturn {
  /** Whether currently listening/recording */
  isListening: boolean;
  /** Whether speech recognition is supported */
  isSupported: boolean;
  /** Whether Whisper is currently transcribing audio */
  isTranscribing: boolean;
  /** Current active provider */
  activeProvider: SpeechRecognitionProvider;
  /** Current volume level (0-1, Whisper mode only) */
  currentVolume: number;
  /** Start listening */
  start: () => void;
  /** Stop listening completely */
  stop: () => void;
  /** Pause listening temporarily */
  pause: () => void;
  /** Resume listening after pause */
  resume: () => void;
}

/**
 * Enhanced speech recognition hook with Whisper API support
 *
 * Features:
 * - Web Speech API for real-time transcription with interim results
 * - Whisper API (OpenAI or local) for high-accuracy transcription
 * - Automatic silence detection for natural conversation flow
 * - Backward compatible with existing usage
 */
export function useSpeechRecognition({
  onResult,
  onInterimResult,
  onRecordingStateChange,
  onVolumeChange,
  lang = "ja-JP",
  provider: providerOverride,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  // State
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [activeProvider, setActiveProvider] =
    useState<SpeechRecognitionProvider>("web");
  const [sttConfig, setSTTConfig] = useState<STTClientConfig | null>(null);
  const [currentVolume, setCurrentVolume] = useState(0);

  // Web Speech API refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(true);
  const isListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const maxRestartAttempts = 5;
  const restartDelayRef = useRef(100);

  // Callback refs to avoid stale closures
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  // Fetch STT configuration from server
  useEffect(() => {
    async function fetchSTTConfig() {
      try {
        const res = await fetch("/api/stt/config");
        if (res.ok) {
          const config: STTClientConfig = await res.json();
          setSTTConfig(config);

          // Determine provider from config unless overridden
          if (!providerOverride) {
            const configProvider =
              config.provider === "openai" || config.provider === "local"
                ? "whisper"
                : "web";
            setActiveProvider(configProvider);
            console.log(`[SpeechRecognition] Using provider: ${configProvider}`);
          }
        }
      } catch (error) {
        console.warn(
          "[SpeechRecognition] Failed to fetch STT config, using Web Speech API"
        );
        setActiveProvider("web");
      }
    }
    fetchSTTConfig();
  }, [providerOverride]);

  // Apply provider override
  useEffect(() => {
    if (providerOverride) {
      setActiveProvider(providerOverride);
      console.log(`[SpeechRecognition] Provider overridden to: ${providerOverride}`);
    }
  }, [providerOverride]);

  /**
   * Handle Whisper transcription
   * Called when audio recording is complete
   */
  const handleWhisperTranscription = useCallback(
    async (audioBlob: Blob) => {
      setIsTranscribing(true);
      onInterimResultRef.current?.("...(文字起こし中)");

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "audio.webm");
        // Convert BCP 47 to ISO 639-1 for Whisper
        const whisperLang = lang.split("-")[0];
        formData.append("language", whisperLang);

        console.log(
          `[SpeechRecognition] Sending audio to Whisper: ${audioBlob.size} bytes`
        );

        const response = await fetch("/api/stt", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transcript && data.transcript.trim()) {
            console.log(
              `[SpeechRecognition] Whisper result: "${data.transcript}"`
            );
            onInterimResultRef.current?.("");
            onResultRef.current(data.transcript);
          } else {
            console.log("[SpeechRecognition] Whisper returned empty transcript");
            onInterimResultRef.current?.("");
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            "[SpeechRecognition] Whisper API error:",
            response.status,
            errorData
          );
          onInterimResultRef.current?.("");
        }
      } catch (error) {
        console.error("[SpeechRecognition] Whisper transcription error:", error);
        onInterimResultRef.current?.("");
      } finally {
        setIsTranscribing(false);
      }
    },
    [lang]
  );

  /**
   * Handle volume changes from audio recorder
   */
  const handleVolumeChange = useCallback(
    (volume: number) => {
      setCurrentVolume(volume);
      onVolumeChange?.(volume);
    },
    [onVolumeChange]
  );

  /**
   * Handle recording state changes
   */
  const handleRecordingStateChange = useCallback(
    (recording: boolean) => {
      if (activeProvider === "whisper") {
        setIsListening(recording);
        isListeningRef.current = recording;
      }
      onRecordingStateChange?.(recording);
    },
    [activeProvider, onRecordingStateChange]
  );

  // Audio recorder for Whisper mode
  const {
    isRecording,
    isSupported: isRecorderSupported,
    hasAudioStarted,
    startRecording,
    stopRecording: stopAudioRecording,
  } = useAudioRecorder({
    onAudioReady: handleWhisperTranscription,
    onVolumeChange: handleVolumeChange,
    onRecordingStateChange: handleRecordingStateChange,
    silenceConfig: sttConfig?.silenceDetection as
      | Partial<SilenceDetectionConfig>
      | undefined,
  });

  // Show interim feedback while recording (Whisper mode)
  useEffect(() => {
    if (activeProvider === "whisper") {
      if (isRecording && hasAudioStarted) {
        onInterimResultRef.current?.("...(聴いています)");
      } else if (isRecording && !hasAudioStarted) {
        onInterimResultRef.current?.("...(音声を待っています)");
      } else if (!isRecording && !isTranscribing) {
        // Clear interim when not recording and not transcribing
      }
    }
  }, [isRecording, hasAudioStarted, isTranscribing, activeProvider]);

  // Web Speech API setup
  useEffect(() => {
    // Skip Web Speech setup if using Whisper
    if (activeProvider !== "web") {
      // Cleanup existing Web Speech instance
      if (recognitionRef.current) {
        shouldRestartRef.current = false;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      console.warn("[SpeechRecognition] Web Speech API not supported");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      console.log("[SpeechRecognition] Web Speech started");
      isListeningRef.current = true;
      setIsListening(true);
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
        console.log("[SpeechRecognition] Web Speech result:", finalTranscript);
        onResultRef.current(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case "not-allowed":
          console.error("[SpeechRecognition] Microphone permission denied");
          shouldRestartRef.current = false;
          break;
        case "network":
          console.warn("[SpeechRecognition] Network error - will retry");
          break;
        case "no-speech":
          console.log("[SpeechRecognition] No speech detected");
          restartAttemptsRef.current = 0;
          break;
        case "aborted":
          console.log("[SpeechRecognition] Aborted");
          break;
        case "audio-capture":
          console.error("[SpeechRecognition] Audio capture failed");
          break;
        default:
          console.error("[SpeechRecognition] Error:", event.error);
      }
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] Web Speech ended");
      isListeningRef.current = false;
      setIsListening(false);

      // Auto restart with exponential backoff
      if (shouldRestartRef.current && activeProvider === "web") {
        if (restartAttemptsRef.current >= maxRestartAttempts) {
          console.warn(
            "[SpeechRecognition] Max restart attempts reached, waiting longer..."
          );
          restartAttemptsRef.current = 0;
          restartDelayRef.current = 2000;
        }

        const delay = restartDelayRef.current;
        restartAttemptsRef.current++;

        console.log(
          `[SpeechRecognition] Restarting in ${delay}ms (attempt ${restartAttemptsRef.current})...`
        );

        setTimeout(() => {
          if (
            shouldRestartRef.current &&
            !isListeningRef.current &&
            activeProvider === "web"
          ) {
            try {
              recognition.start();
            } catch (e) {
              console.log("[SpeechRecognition] Already running, skip restart");
            }
          }
        }, delay);

        restartDelayRef.current = Math.min(restartDelayRef.current * 1.5, 2000);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      recognition.abort();
    };
  }, [lang, activeProvider]);

  // Update isSupported based on active provider
  useEffect(() => {
    if (activeProvider === "whisper") {
      setIsSupported(isRecorderSupported);
    }
  }, [activeProvider, isRecorderSupported]);

  // Control methods
  const start = useCallback(() => {
    if (activeProvider === "whisper") {
      if (!isRecording) {
        shouldRestartRef.current = true;
        startRecording();
      }
    } else {
      if (!recognitionRef.current || isListeningRef.current) return;
      shouldRestartRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    }
  }, [activeProvider, isRecording, startRecording]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (activeProvider === "whisper") {
      stopAudioRecording();
    } else {
      if (!recognitionRef.current) return;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
  }, [activeProvider, stopAudioRecording]);

  const pause = useCallback(() => {
    shouldRestartRef.current = false;
    if (activeProvider === "whisper") {
      stopAudioRecording();
    } else {
      if (!recognitionRef.current || !isListeningRef.current) return;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
  }, [activeProvider, stopAudioRecording]);

  const resume = useCallback(() => {
    if (activeProvider === "whisper") {
      if (!isRecording && !isTranscribing) {
        shouldRestartRef.current = true;
        startRecording();
      }
    } else {
      if (!recognitionRef.current || isListeningRef.current) return;
      shouldRestartRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    }
  }, [activeProvider, isRecording, isTranscribing, startRecording]);

  return {
    isListening,
    isSupported,
    isTranscribing,
    activeProvider,
    currentVolume,
    start,
    stop,
    pause,
    resume,
  };
}
