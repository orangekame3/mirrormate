"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSpeakerSelector, type Speaker } from "@/hooks/useSpeakerSelector";
import { useCharacterSelector, type CharacterPreset } from "@/hooks/useCharacterSelector";
import { SettingsDropdown } from "@/components/SettingsDropdown";
import { VoicePreviewButton } from "@/components/VoicePreviewButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
}

interface BroadcastMessage {
  type: "speaking_start" | "speaking_end" | "thinking_start" | "thinking_end" | "response" | "audio" | "user_message" | "play_audio" | "mic_start" | "mic_stop" | "mic_status" | "mic_request_status" | "settings_changed" | "vision_toggle" | "camera_capture_request" | "camera_capture_response";
  payload?: string | boolean | null;
}

export default function ControlPage() {
  const t = useTranslations("control");
  const tMic = useTranslations("mic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<"off" | "listening" | "paused">("off");
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingCaptureRef = useRef<{
    resolve: (image: string | null) => void;
    timeout: NodeJS.Timeout;
  } | null>(null);

  // Speaker and Character selectors
  const {
    speakers,
    selectedSpeaker,
    setSelectedSpeaker,
    isLoading: speakersLoading,
    error: speakersError,
    previewVoice,
    isPreviewPlaying,
  } = useSpeakerSelector();

  const {
    characters,
    selectedCharacter,
    setSelectedCharacter,
    isLoading: charactersLoading,
    getSelectedCharacterInfo,
  } = useCharacterSelector();

  useEffect(() => {
    channelRef.current = new BroadcastChannel("mirror-channel");

    // Receive messages from avatar page
    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data.type === "mic_status") {
        setMicStatus(event.data.payload as "off" | "listening" | "paused");
      } else if (event.data.type === "camera_capture_response") {
        // Resolve pending camera capture request
        if (pendingCaptureRef.current) {
          clearTimeout(pendingCaptureRef.current.timeout);
          pendingCaptureRef.current.resolve(event.data.payload as string | null);
          pendingCaptureRef.current = null;
          setIsCapturingImage(false);
        }
      }
    };

    // Request status from avatar page on connect
    channelRef.current.postMessage({ type: "mic_request_status" });

    return () => {
      channelRef.current?.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const broadcast = useCallback((message: BroadcastMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  // Request camera capture from vision companion
  const requestCameraCapture = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!channelRef.current) {
        resolve(null);
        return;
      }

      setIsCapturingImage(true);

      // Set up timeout for capture response
      const timeout = setTimeout(() => {
        console.warn("[Control] Camera capture timeout");
        if (pendingCaptureRef.current) {
          pendingCaptureRef.current = null;
          setIsCapturingImage(false);
          resolve(null);
        }
      }, 2000);

      pendingCaptureRef.current = { resolve, timeout };

      // Request capture
      channelRef.current.postMessage({ type: "camera_capture_request" });
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Capture camera image when vision is enabled (LLM will decide if it needs to use see_camera tool)
      let capturedImage: string | null = null;
      if (visionEnabled) {
        capturedImage = await requestCameraCapture();
        if (capturedImage) {
          console.log("[Control] Camera image captured for vision");
        }
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
        hasImage: !!capturedImage,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      // Notify avatar page of user message and thinking state
      broadcast({ type: "user_message", payload: content });
      broadcast({ type: "thinking_start" });

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            withAudio: false,
            characterId: selectedCharacter || undefined,
            image: capturedImage || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Notify avatar page of response
        broadcast({ type: "thinking_end" });
        broadcast({ type: "response", payload: data.message });

        // Request audio playback (avatar will fetch TTS with speaker)
        if (data.message) {
          broadcast({
            type: "play_audio",
            payload: JSON.stringify({
              text: data.message,
              speaker: selectedSpeaker,
            }),
          });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        broadcast({ type: "thinking_end" });

        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connection interrupted.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        broadcast({ type: "response", payload: "Connection interrupted." });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, broadcast, selectedSpeaker, selectedCharacter, visionEnabled, requestCameraCapture]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Get selected character info for display
  const selectedCharacterInfo = getSelectedCharacterInfo();

  return (
    <main className="h-screen w-screen bg-zinc-950 flex flex-col">
      {/* Top Header - Title & Mic */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white/90 text-lg font-medium">{t("title")}</h1>
          {selectedCharacterInfo && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-white/70 text-sm">{selectedCharacterInfo.name}</span>
            </div>
          )}
        </div>

        {/* Mic Control */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900">
            {micStatus === "listening" ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">{tMic("listening")}</span>
              </>
            ) : micStatus === "paused" ? (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-400 text-xs">{tMic("paused")}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-zinc-600 rounded-full" />
                <span className="text-white/40 text-xs">{tMic("off")}</span>
              </>
            )}
          </div>

          <button
            onClick={() => {
              broadcast({ type: "mic_start" });
              setMicStatus("listening");
            }}
            disabled={micStatus === "listening"}
            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={t("micOn")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          <button
            onClick={() => {
              broadcast({ type: "mic_stop" });
              setMicStatus("off");
            }}
            disabled={micStatus === "off"}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title={t("micOff")}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="border-b border-zinc-800/50 px-6 py-3 bg-zinc-900/30">
        <div className="flex items-end gap-4">
          {/* Character Selector */}
          <SettingsDropdown<CharacterPreset>
            label={t("character") || "Character"}
            items={characters}
            selectedId={selectedCharacter}
            onSelect={(id) => {
              setSelectedCharacter(id as string);
              const char = characters.find((c) => c.id === id);
              if (char?.recommendedVoice && speakers.some((s) => s.id === char.recommendedVoice)) {
                setSelectedSpeaker(char.recommendedVoice);
              }
            }}
            getId={(c) => c.id}
            renderItem={(c) => (
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-white/40 mt-0.5">{c.description}</div>
              </div>
            )}
            renderSelected={(c) => c ? c.name : null}
            disabled={charactersLoading}
            placeholder={t("selectCharacter") || "Select character..."}
          />

          {/* Voice Selector */}
          <SettingsDropdown<Speaker>
            label={t("voice") || "Voice"}
            items={speakers}
            selectedId={selectedSpeaker}
            onSelect={(id) => setSelectedSpeaker(id as number)}
            getId={(s) => s.id}
            renderItem={(s) => (
              <span>{s.name} ({s.styleName})</span>
            )}
            renderSelected={(s) => s ? `${s.name} (${s.styleName})` : null}
            disabled={speakersLoading || !!speakersError}
            placeholder={speakersError || (t("selectVoice") || "Select voice...")}
          />

          {/* Preview Button */}
          <VoicePreviewButton
            onClick={() => selectedSpeaker && previewVoice(selectedSpeaker)}
            isPlaying={isPreviewPlaying}
            disabled={!selectedSpeaker || speakersLoading}
            label={t("preview") || "Preview"}
          />

          {/* Vision Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newValue = !visionEnabled;
                setVisionEnabled(newValue);
                channelRef.current?.postMessage({
                  type: "vision_toggle",
                  payload: newValue,
                });
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                visionEnabled
                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  : "bg-zinc-800 text-white/40 hover:bg-zinc-700"
              }`}
              title={visionEnabled ? "Vision greeting enabled" : "Vision greeting disabled"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm">{visionEnabled ? "Vision ON" : "Vision OFF"}</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Vision Test Link */}
          <Link
            href="/control/vision"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-white/60 hover:text-white/80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm">Vision</span>
          </Link>

          {/* Memory Link */}
          <Link
            href="/control/memory"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-white/60 hover:text-white/80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm">Memory</span>
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-white/30 text-center py-12">
            {t("placeholder")}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === "user"
                  ? "bg-white/10 text-white/90"
                  : "bg-zinc-800 text-white/80"
              }`}
            >
              {message.hasImage && (
                <div className="flex items-center gap-1 text-emerald-400 text-xs mb-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Camera attached</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className="text-[10px] text-white/30 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            disabled={isLoading}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white/80 rounded-xl transition-colors"
          >
            {t("send")}
          </button>
        </div>
      </form>
    </main>
  );
}
