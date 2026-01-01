"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface BroadcastMessage {
  type: "speaking_start" | "speaking_end" | "thinking_start" | "thinking_end" | "response" | "audio" | "user_message" | "play_audio" | "mic_start" | "mic_stop" | "mic_status" | "mic_request_status";
  payload?: string;
}

export default function ControlPage() {
  const t = useTranslations("control");
  const tMic = useTranslations("mic");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [micStatus, setMicStatus] = useState<"off" | "listening" | "paused">("off");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("mirror-channel");

    // Receive mic status from avatar page
    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      if (event.data.type === "mic_status") {
        setMicStatus(event.data.payload as "off" | "listening" | "paused");
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

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
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

        // Request audio playback (avatar will fetch TTS)
        if (data.message) {
          broadcast({ type: "play_audio", payload: data.message });
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
    [messages, isLoading, broadcast]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <main className="h-screen w-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white/80 text-sm tracking-widest uppercase">{t("title")}</h1>
          <p className="text-white/40 text-xs mt-1">Avatar: <span className="text-white/60">localhost:3000</span></p>
        </div>

        {/* Mic Control */}
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {micStatus === "listening" ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">{tMic("listening")}</span>
              </>
            ) : micStatus === "paused" ? (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-yellow-400 text-sm">{tMic("paused")}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-zinc-600 rounded-full" />
                <span className="text-white/40 text-sm">{tMic("off")}</span>
              </>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={() => {
              broadcast({ type: "mic_start" });
              setMicStatus("listening");
            }}
            disabled={micStatus === "listening"}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm">{t("micOn")}</span>
          </button>

          {/* Stop Button */}
          <button
            onClick={() => {
              broadcast({ type: "mic_stop" });
              setMicStatus("off");
            }}
            disabled={micStatus === "off"}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            <span className="text-sm">{t("micOff")}</span>
          </button>
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
