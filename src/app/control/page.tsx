"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface BroadcastMessage {
  type: "speaking_start" | "speaking_end" | "thinking_start" | "thinking_end" | "response" | "audio" | "user_message" | "play_audio";
  payload?: string;
}

export default function ControlPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel("mirror-channel");
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

      // アバター画面にユーザーメッセージと「考え中」を通知
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

        // アバター画面に「考え中終了」と「回答」を通知
        broadcast({ type: "thinking_end" });
        broadcast({ type: "response", payload: data.message });

        // 音声を再生するよう通知（メッセージ内容を送り、アバター側でTTS取得）
        if (data.message) {
          broadcast({ type: "play_audio", payload: data.message });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        broadcast({ type: "thinking_end" });

        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "接続が中断されました。",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        broadcast({ type: "response", payload: "接続が中断されました。" });
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
      <div className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-white/80 text-sm tracking-widest uppercase">Control Panel</h1>
        <p className="text-white/40 text-xs mt-1">アバター画面: <span className="text-white/60">localhost:3001</span></p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-white/30 text-center py-12">
            メッセージを入力してください
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
            placeholder="メッセージを入力..."
            disabled={isLoading}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white/80 rounded-xl transition-colors"
          >
            送信
          </button>
        </div>
      </form>
    </main>
  );
}
