"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import SimpleAvatar from "@/components/SimpleAvatar";
import Confetti, { EffectType } from "@/components/Confetti";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useWakeWord } from "@/hooks/useWakeWord";
import { useReminder, Reminder } from "@/hooks/useReminder";
import { useAvatarState } from "@/hooks/useAvatarState";
import { useAnimationController } from "@/hooks/useAnimationController";
import { useLongThinkingPulse } from "@/hooks/useLongThinkingPulse";
import { FloatingInfo, InfoCard, detectInfoFromResponse } from "@/components/FloatingInfo";
import PluginRenderer from "@/components/PluginRenderer";
import { mapBroadcastToEvent, type BroadcastMessage } from "@/lib/animation/broadcast-adapter";
import { getAcknowledgment } from "@/lib/quick-ack";

export default function AvatarPage() {
  const t = useTranslations("mic");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [userText, setUserText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [isTextFading, setIsTextFading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [infoCards, setInfoCards] = useState<InfoCard[]>([]);
  const [showEffect, setShowEffect] = useState(false);
  const [effectType, setEffectType] = useState<EffectType>("confetti");
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textFadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);

  // Animation state machine
  const { state: avatarState, context: stateContext, dispatch: dispatchState } = useAvatarState();

  // Wake word hook
  const {
    mode: wakeWordMode,
    config: wakeWordConfig,
    isEnabled: isWakeWordEnabled,
    checkForWakeWord,
    resetTimeout: resetWakeWordTimeout,
    endConversation,
  } = useWakeWord();

  // Override avatar state to SLEEP when waiting for wake word
  const effectiveAvatarState = useMemo(() => {
    if (isWakeWordEnabled && wakeWordMode === "waiting" && !isSpeaking && !isThinking) {
      return "SLEEP" as const;
    }
    return avatarState;
  }, [isWakeWordEnabled, wakeWordMode, isSpeaking, isThinking, avatarState]);

  const animationParams = useAnimationController(effectiveAvatarState, stateContext, { mousePosition });
  const { showPulse: showLongThinkingPulse } = useLongThinkingPulse(effectiveAvatarState, stateContext);

  // Track mouse position for gaze
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

  // Sync state machine with boolean states
  useEffect(() => {
    if (speechEnabled) {
      dispatchState({ type: "MIC_ACTIVATED" });
    } else {
      dispatchState({ type: "MIC_DEACTIVATED" });
    }
  }, [speechEnabled, dispatchState]);

  useEffect(() => {
    if (isThinking) {
      dispatchState({ type: "PROCESSING_START" });
    } else {
      dispatchState({ type: "PROCESSING_END" });
    }
  }, [isThinking, dispatchState]);

  useEffect(() => {
    if (isSpeaking) {
      dispatchState({ type: "TTS_START" });
    } else {
      dispatchState({ type: "TTS_END" });
    }
  }, [isSpeaking, dispatchState]);

  // Add InfoCard
  const addInfoCard = useCallback((response: string) => {
    const card = detectInfoFromResponse(response);
    if (card) {
      setInfoCards((prev) => [...prev, card]);
    }
  }, []);

  // Dismiss InfoCard
  const dismissInfoCard = useCallback((id: string) => {
    setInfoCards((prev) => prev.filter((card) => card.id !== id));
  }, []);

  // Auto fade-out text
  useEffect(() => {
    if (displayText && !isThinking) {
      // Clear existing timer
      if (textFadeTimeoutRef.current) {
        clearTimeout(textFadeTimeoutRef.current);
      }
      setIsTextFading(false);

      // Start fade after 8s, clear after 10s
      textFadeTimeoutRef.current = setTimeout(() => {
        setIsTextFading(true);
        setTimeout(() => {
          setDisplayText("");
          setUserText("");
          setIsTextFading(false);
        }, 2000); // Fade animation duration
      }, 8000);
    }

    return () => {
      if (textFadeTimeoutRef.current) {
        clearTimeout(textFadeTimeoutRef.current);
      }
    };
  }, [displayText, isThinking]);

  // Analyze audio amplitude in real-time
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    const voiceRange = Math.floor(dataArray.length * 0.3);
    for (let i = 0; i < voiceRange; i++) {
      sum += dataArray[i];
    }
    const average = sum / voiceRange;
    const normalized = Math.min(1, (average / 128) * 1.5);
    setMouthOpenness(normalized);

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  const playAudio = useCallback(async (audioBase64: string) => {
    return new Promise<void>(async (resolve) => {
      try {
        // Reuse existing AudioContext for background playback
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;

        // Wait for audio to load
        await new Promise<void>((res) => {
          audio.oncanplaythrough = () => res();
          audio.onerror = () => res();
        });

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.3;
        analyserRef.current = analyser;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audio.onplay = () => {
          setIsSpeaking(true);
          analyzeAudio();
        };
        audio.onended = () => {
          setIsSpeaking(false);
          setMouthOpenness(0);
          cancelAnimationFrame(animationRef.current);
          // Keep AudioContext open for reuse
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio error:", e);
          setIsSpeaking(false);
          setMouthOpenness(0);
          cancelAnimationFrame(animationRef.current);
          resolve();
        };

        await audio.play();
      } catch (e) {
        console.error("playAudio error:", e);
        setIsSpeaking(false);
        setMouthOpenness(0);
        resolve();
      }
    });
  }, [analyzeAudio]);

  // Handle reminder notifications
  const handleReminder = useCallback(
    async (reminder: Reminder) => {
      const timeText = `${reminder.configuredMinutes}分後`;

      // Add reminder card
      const card: InfoCard = {
        id: reminder.id,
        type: "reminder",
        title: `${timeText}に予定があります`,
        items: [reminder.summary],
        urgent: reminder.urgent,
      };
      setInfoCards((prev) => [...prev, card]);

      // Notify via TTS if not currently speaking
      if (!isSpeaking && !isProcessing) {
        const message = `${timeText}に「${reminder.summary}」の予定があります。`;
        setDisplayText(message);

        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              await playAudio(data.audio);
            }
          }
        } catch (e) {
          console.error("Reminder TTS error:", e);
        }
      }
    },
    [isSpeaking, isProcessing, playAudio]
  );

  // Reminder hook (config loaded from YAML)
  useReminder({
    onReminder: handleReminder,
  });

  // Process speech recognition results
  const handleSpeechResult = useCallback(
    async (transcript: string) => {
      if (isProcessing || isSpeaking) return;

      // Wake word mode handling
      if (isWakeWordEnabled) {
        if (wakeWordMode === "waiting") {
          // Check for wake word
          const wakeWordDetected = checkForWakeWord(transcript);
          if (!wakeWordDetected) {
            // No wake word detected, ignore
            return;
          }

          // Extract message after wake word (if any)
          const phrase = wakeWordConfig?.phrase ?? "";
          const normalizedPhrase = phrase.toLowerCase().replace(/\s+/g, "");
          const normalizedTranscript = transcript.toLowerCase().replace(/\s+/g, "");
          const phraseIndex = normalizedTranscript.indexOf(normalizedPhrase);

          if (phraseIndex !== -1) {
            // Find the actual position in original transcript
            let charCount = 0;
            let actualIndex = 0;
            for (let i = 0; i < transcript.length; i++) {
              if (!/\s/.test(transcript[i])) {
                if (charCount === phraseIndex + normalizedPhrase.length) {
                  actualIndex = i;
                  break;
                }
                charCount++;
              }
              actualIndex = i + 1;
            }

            const messageAfterWakeWord = transcript.substring(actualIndex).trim();
            if (!messageAfterWakeWord) {
              // Just wake word, wait for next message
              return;
            }
            // Use the message after wake word
            transcript = messageAfterWakeWord;
          }
        } else {
          // In conversation mode, reset timeout
          resetWakeWordTimeout();
        }
      }

      setIsProcessing(true);
      setUserText(transcript);
      setInterimText("");
      setDisplayText("");
      setIsThinking(true);

      // Add to message history
      messagesRef.current.push({ role: "user", content: transcript });

      try {
        // Generate quick acknowledgment for immediate feedback
        const ack = getAcknowledgment(transcript);

        // Start acknowledgment TTS immediately (non-blocking)
        let ackAudioPromise: Promise<void> | null = null;
        if (ack) {
          setDisplayText(ack);
          ackAudioPromise = (async () => {
            try {
              const ttsRes = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: ack }),
              });
              if (ttsRes.ok) {
                const ttsData = await ttsRes.json();
                if (ttsData.audio) {
                  await playAudio(ttsData.audio);
                }
              }
            } catch (e) {
              console.error("Ack TTS error:", e);
            }
          })();
        }

        // Start chat API call in parallel with acknowledgment
        const chatPromise = fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesRef.current,
            withAudio: false,
          }),
        });

        // Wait for acknowledgment to finish playing (if any)
        if (ackAudioPromise) {
          await ackAudioPromise;
        }

        // Now process chat response
        const res = await chatPromise;

        if (res.ok) {
          const data = await res.json();
          setIsThinking(false);
          setDisplayText(data.message);

          // Add to message history
          messagesRef.current.push({ role: "assistant", content: data.message });

          // Detect weather/calendar info and show card
          addInfoCard(data.message);

          // Show effect
          if (data.effect === "confetti" || data.effect === "hearts" || data.effect === "sparkles") {
            setEffectType(data.effect as EffectType);
            setShowEffect(true);
          }

          // Play TTS
          if (data.message) {
            const ttsRes = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: data.message }),
            });

            if (ttsRes.ok) {
              const ttsData = await ttsRes.json();
              if (ttsData.audio) {
                await playAudio(ttsData.audio);
              }
            }
          }
        }
      } catch (e) {
        console.error("Chat error:", e);
        setIsThinking(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, isSpeaking, playAudio, addInfoCard, isWakeWordEnabled, wakeWordMode, wakeWordConfig, checkForWakeWord, resetWakeWordTimeout]
  );

  // Speech recognition hook
  const { isListening, isSupported, start, stop, pause, resume } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onInterimResult: setInterimText,
    lang: "ja-JP",
  });

  // Pause speech recognition while speaking
  useEffect(() => {
    if (isSpeaking || isProcessing) {
      pause();
    } else if (speechEnabled) {
      resume();
    }
  }, [isSpeaking, isProcessing, speechEnabled, pause, resume]);

  // Broadcast mic status
  const broadcastMicStatus = useCallback((enabled: boolean, listening: boolean) => {
    const status = !enabled ? "off" : listening ? "listening" : "paused";
    try {
      channelRef.current?.postMessage({ type: "mic_status", payload: status });
    } catch {
      // Channel is closed - ignore
    }
  }, []);

  // Notify control panel of mic status
  useEffect(() => {
    broadcastMicStatus(speechEnabled, isListening);
  }, [speechEnabled, isListening, broadcastMicStatus]);

  // Initialize AudioContext on click (required for TTS playback)
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  // Receive messages via BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel("mirror-channel");

    channelRef.current.onmessage = async (event: MessageEvent<BroadcastMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case "user_message":
          setUserText(payload || "");
          setDisplayText("");
          break;
        case "thinking_start":
          setIsThinking(true);
          break;
        case "thinking_end":
          setIsThinking(false);
          break;
        case "response":
          setDisplayText(payload || "");
          // Detect weather/calendar info and show card
          if (payload) {
            const card = detectInfoFromResponse(payload);
            if (card) {
              setInfoCards((prev) => [...prev, card]);
            }
          }
          break;
        case "play_audio":
          if (payload) {
            // Call TTS API and play audio
            try {
              const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: payload }),
              });
              if (res.ok) {
                const data = await res.json();
                if (data.audio) {
                  await playAudio(data.audio);
                }
              }
            } catch (e) {
              console.error("TTS error:", e);
            }
          }
          break;
        case "speaking_start":
          setIsSpeaking(true);
          break;
        case "speaking_end":
          setIsSpeaking(false);
          setMouthOpenness(0);
          break;
        case "mic_start":
          setSpeechEnabled(true);
          start();
          break;
        case "mic_stop":
          setSpeechEnabled(false);
          stop();
          break;
        case "mic_request_status":
          // Respond to control panel status request
          broadcastMicStatus(speechEnabled, isListening);
          break;
        case "effect":
          if (payload === "confetti" || payload === "hearts" || payload === "sparkles") {
            setEffectType(payload as EffectType);
            setShowEffect(true);
          }
          break;
      }
    };

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      channelRef.current?.close();
    };
  }, [playAudio, start, stop, broadcastMicStatus, speechEnabled, isListening]);

  return (
    <main
      className="h-screen w-screen bg-black flex flex-col items-center overflow-hidden relative cursor-pointer"
      onClick={initAudioContext}
    >
      {/* Effects */}
      <Confetti isActive={showEffect} effectType={effectType} onComplete={() => setShowEffect(false)} />

      {/* Mic Status Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {!speechEnabled ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-zinc-600 rounded-full" />
            <span className="text-white/30 text-xs">{t("off")}</span>
          </div>
        ) : isListening ? (
          <div className="flex items-center gap-2">
            {isWakeWordEnabled && wakeWordMode === "waiting" ? (
              <>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-white/50 text-xs">
                  {t("wakeWordPrompt", { phrase: wakeWordConfig?.phrase ?? "" })}
                </span>
              </>
            ) : isWakeWordEnabled && wakeWordMode === "conversation" ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white/50 text-xs">{t("inConversation")}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white/50 text-xs">{t("listening")}</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-white/50 text-xs">{t("paused")}</span>
          </div>
        )}
      </div>

      {/* User Message - Top */}
      <div className="w-full h-[15%] flex items-end justify-center px-8 pb-4">
        {(userText || interimText) && (
          <p
            className={`text-white/50 text-base text-center font-light tracking-wide max-w-xl transition-opacity duration-2000 ${
              isTextFading ? "opacity-0" : "opacity-100"
            }`}
          >
            {userText || <span className="text-white/30 italic">{interimText}</span>}
          </p>
        )}
      </div>

      {/* Avatar - Center */}
      <div className="w-full h-[55%] relative">
        {/* Avatar with slide animation */}
        <div
          className={`absolute inset-0 transition-transform duration-500 ease-out ${
            infoCards.length > 0 ? "-translate-x-[15%]" : "translate-x-0"
          }`}
        >
          <SimpleAvatar
            isSpeaking={isSpeaking}
            isThinking={isThinking}
            mouthOpenness={mouthOpenness}
            avatarState={effectiveAvatarState}
            animationParams={animationParams}
          />
        </div>
        {/* Floating Info Cards */}
        <FloatingInfo cards={infoCards} onDismiss={dismissInfoCard} autoHideDuration={10000} />
      </div>

      {/* Response Text - Bottom */}
      <div className="w-full h-[30%] flex items-start justify-center px-8 pt-6">
        {isThinking && !displayText ? (
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : displayText ? (
          <p
            className={`text-white/90 text-xl text-center font-light tracking-wide leading-relaxed max-w-2xl transition-opacity duration-2000 ${
              isTextFading ? "opacity-0" : "opacity-100"
            }`}
          >
            {displayText}
          </p>
        ) : null}
      </div>

      {/* Plugin Widgets */}
      <PluginRenderer />
    </main>
  );
}
