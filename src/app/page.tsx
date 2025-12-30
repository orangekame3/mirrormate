"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import SimpleAvatar from "@/components/SimpleAvatar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface BroadcastMessage {
  type: "speaking_start" | "speaking_end" | "thinking_start" | "thinking_end" | "response" | "play_audio" | "user_message" | "mic_start" | "mic_stop" | "mic_status" | "mic_request_status";
  payload?: string;
}

export default function AvatarPage() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [mouthOpenness, setMouthOpenness] = useState(0);
  const [userText, setUserText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);

  // 音声振幅をリアルタイムで解析
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
        // 既存のAudioContextを再利用（バックグラウンド再生のため）
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;

        // 音声がロードされるのを待つ
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
          // AudioContextは閉じずに再利用する
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

  // 音声認識の結果を処理
  const handleSpeechResult = useCallback(
    async (transcript: string) => {
      if (isProcessing || isSpeaking) return;

      setIsProcessing(true);
      setUserText(transcript);
      setInterimText("");
      setDisplayText("");
      setIsThinking(true);

      // メッセージ履歴に追加
      messagesRef.current.push({ role: "user", content: transcript });

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesRef.current,
            withAudio: false,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setIsThinking(false);
          setDisplayText(data.message);

          // メッセージ履歴に追加
          messagesRef.current.push({ role: "assistant", content: data.message });

          // TTS再生
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
    [isProcessing, isSpeaking, playAudio]
  );

  // 音声認識フック
  const { isListening, isSupported, start, stop, pause, resume } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onInterimResult: setInterimText,
    lang: "ja-JP",
  });

  // 話している間は音声認識を一時停止
  useEffect(() => {
    if (isSpeaking || isProcessing) {
      pause();
    } else if (speechEnabled) {
      resume();
    }
  }, [isSpeaking, isProcessing, speechEnabled, pause, resume]);

  // マイク状態を送信する関数
  const broadcastMicStatus = useCallback((enabled: boolean, listening: boolean) => {
    const status = !enabled ? "off" : listening ? "listening" : "paused";
    try {
      channelRef.current?.postMessage({ type: "mic_status", payload: status });
    } catch {
      // Channel is closed - ignore
    }
  }, []);

  // マイク状態をコントロールパネルに通知
  useEffect(() => {
    broadcastMicStatus(speechEnabled, isListening);
  }, [speechEnabled, isListening, broadcastMicStatus]);

  // 画面クリックでAudioContextを初期化（TTS再生に必要）
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }, []);

  // BroadcastChannel でメッセージを受信
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
          break;
        case "play_audio":
          if (payload) {
            // TTS APIを呼んで音声を取得して再生
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
          // コントロールパネルからの状態要求に応答
          broadcastMicStatus(speechEnabled, isListening);
          break;
      }
    };

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) {
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
      {/* Mic Status Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {!speechEnabled ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-zinc-600 rounded-full" />
            <span className="text-white/30 text-xs">Mic Off</span>
          </div>
        ) : isListening ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/50 text-xs">Listening</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-white/50 text-xs">Paused</span>
          </div>
        )}
      </div>

      {/* User Message - Top */}
      <div className="w-full h-[15%] flex items-end justify-center px-8 pb-4">
        {(userText || interimText) && (
          <p className="text-white/50 text-base text-center font-light tracking-wide max-w-xl">
            {userText || <span className="text-white/30 italic">{interimText}</span>}
          </p>
        )}
      </div>

      {/* Avatar - Center */}
      <div className="w-full h-[55%] relative">
        <SimpleAvatar isSpeaking={isSpeaking} isThinking={isThinking} mouthOpenness={mouthOpenness} />
      </div>

      {/* Response Text - Bottom */}
      <div className="w-full h-[30%] flex items-start justify-center px-8 pt-6">
        {isThinking && !displayText ? (
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <p className="text-white/90 text-xl text-center font-light tracking-wide leading-relaxed max-w-2xl">
            {displayText}
          </p>
        )}
      </div>
    </main>
  );
}
