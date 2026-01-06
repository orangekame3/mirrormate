"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { SilenceDetectionConfig, DEFAULT_SILENCE_CONFIG } from "@/lib/stt";

interface UseAudioRecorderOptions {
  /** Called when audio recording is ready to be processed */
  onAudioReady: (audioBlob: Blob) => void;
  /** Called with volume level (0-1) for visualization */
  onVolumeChange?: (volume: number) => void;
  /** Called when recording state changes */
  onRecordingStateChange?: (isRecording: boolean) => void;
  /** Custom silence detection settings */
  silenceConfig?: Partial<SilenceDetectionConfig>;
}

interface UseAudioRecorderReturn {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether MediaRecorder is supported in this browser */
  isSupported: boolean;
  /** Whether audio activity has been detected (voice started) */
  hasAudioStarted: boolean;
  /** Current volume level (0-1) */
  currentVolume: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording manually */
  stopRecording: () => void;
}

/**
 * Hook for recording audio with automatic silence detection
 *
 * Features:
 * - MediaRecorder for audio capture
 * - Web Audio API for real-time volume analysis
 * - RMS-based silence detection
 * - Automatic stop when silence detected for configured duration
 * - Maximum recording duration limit
 */
export function useAudioRecorder({
  onAudioReady,
  onVolumeChange,
  onRecordingStateChange,
  silenceConfig: customSilenceConfig,
}: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [hasAudioStarted, setHasAudioStarted] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);

  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Refs for silence detection
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const shouldStopRef = useRef(false);
  const hasAudioStartedRef = useRef(false);

  // Callback refs to avoid stale closures
  const onAudioReadyRef = useRef(onAudioReady);
  const onVolumeChangeRef = useRef(onVolumeChange);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

  useEffect(() => {
    onAudioReadyRef.current = onAudioReady;
  }, [onAudioReady]);

  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  useEffect(() => {
    onRecordingStateChangeRef.current = onRecordingStateChange;
  }, [onRecordingStateChange]);

  // Merge custom config with defaults (memoized to prevent unnecessary re-renders)
  const silenceConfig = useMemo<SilenceDetectionConfig>(
    () => ({
      ...DEFAULT_SILENCE_CONFIG,
      ...customSilenceConfig,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      customSilenceConfig?.silenceThreshold,
      customSilenceConfig?.volumeThreshold,
      customSilenceConfig?.minRecordingDuration,
      customSilenceConfig?.maxRecordingDuration,
    ]
  );

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices &&
      "MediaRecorder" in window;
    setIsSupported(supported);
  }, []);

  /**
   * Calculate RMS (Root Mean Square) volume from audio data
   * RMS is a good measure of perceived loudness
   */
  const calculateRMS = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      // Convert from 0-255 to -1 to 1
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  /**
   * Stop recording and process collected audio
   */
  const stopRecording = useCallback(() => {
    shouldStopRef.current = true;
    cancelAnimationFrame(animationFrameRef.current);

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setCurrentVolume(0);
    onRecordingStateChangeRef.current?.(false);
  }, []);

  /**
   * Monitor audio levels for silence detection
   * Uses requestAnimationFrame for smooth updates
   */
  const monitorAudio = useCallback(() => {
    if (!analyserRef.current || shouldStopRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    const rms = calculateRMS(dataArray);
    setCurrentVolume(rms);
    onVolumeChangeRef.current?.(rms);

    const now = Date.now();
    const recordingDuration = now - recordingStartRef.current;

    // Check for audio activity start (voice detected)
    if (!hasAudioStartedRef.current && rms > silenceConfig.volumeThreshold) {
      hasAudioStartedRef.current = true;
      setHasAudioStarted(true);
      silenceStartRef.current = null;
      console.log("[AudioRecorder] Voice activity detected");
    }

    // Only check for silence after:
    // 1. Audio has started (voice was detected)
    // 2. Minimum recording duration has passed
    if (
      hasAudioStartedRef.current &&
      recordingDuration > silenceConfig.minRecordingDuration
    ) {
      if (rms < silenceConfig.volumeThreshold) {
        // Below threshold - track silence duration
        if (silenceStartRef.current === null) {
          silenceStartRef.current = now;
        } else {
          const silenceDuration = (now - silenceStartRef.current) / 1000;
          if (silenceDuration >= silenceConfig.silenceThreshold) {
            console.log(
              `[AudioRecorder] Silence detected for ${silenceDuration.toFixed(1)}s, stopping...`
            );
            stopRecording();
            return;
          }
        }
      } else {
        // Above threshold - reset silence timer
        silenceStartRef.current = null;
      }
    }

    // Auto-stop at maximum recording duration
    if (recordingDuration >= silenceConfig.maxRecordingDuration) {
      console.log("[AudioRecorder] Max duration reached, stopping...");
      stopRecording();
      return;
    }

    // Continue monitoring
    animationFrameRef.current = requestAnimationFrame(monitorAudio);
  }, [calculateRMS, silenceConfig, stopRecording]);

  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    if (isRecording || !isSupported) {
      return;
    }

    try {
      // Request microphone access with noise reduction
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up AudioContext for volume analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      console.log(`[AudioRecorder] Using MIME type: ${mimeType}`);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log(
          `[AudioRecorder] Recording stopped, blob size: ${audioBlob.size} bytes`
        );

        // Only process if we have meaningful audio
        if (audioBlob.size > 1000 && hasAudioStartedRef.current) {
          onAudioReadyRef.current(audioBlob);
        } else {
          console.log(
            "[AudioRecorder] Recording too short or no voice detected, discarding"
          );
        }

        // Cleanup media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Cleanup AudioContext
        if (audioContextRef.current?.state !== "closed") {
          audioContextRef.current?.close();
          audioContextRef.current = null;
        }
      };

      // Reset state for new recording
      shouldStopRef.current = false;
      silenceStartRef.current = null;
      hasAudioStartedRef.current = false;
      setHasAudioStarted(false);
      recordingStartRef.current = Date.now();

      // Start recording with 100ms chunks
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      onRecordingStateChangeRef.current?.(true);

      console.log("[AudioRecorder] Started recording");

      // Start audio monitoring for silence detection
      animationFrameRef.current = requestAnimationFrame(monitorAudio);
    } catch (error) {
      console.error("[AudioRecorder] Failed to start recording:", error);

      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          console.error("[AudioRecorder] Microphone permission denied");
        } else if (error.name === "NotFoundError") {
          console.error("[AudioRecorder] No microphone found");
        }
      }
    }
  }, [isRecording, isSupported, monitorAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldStopRef.current = true;
      cancelAnimationFrame(animationFrameRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    hasAudioStarted,
    currentVolume,
    startRecording,
    stopRecording,
  };
}
