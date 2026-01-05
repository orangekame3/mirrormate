"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

interface AnalysisResult {
  timestamp: Date;
  waving: boolean;
  confidence: number;
  reason: string;
  latencyMs: number;
  rawResponse?: string;
}

export default function VisionTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(2);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [vlmStatus, setVlmStatus] = useState<"unknown" | "connected" | "error">("unknown");

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error("Camera access denied:", error);
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture image
  const captureImage = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  // Analyze image
  const analyzeImage = useCallback(async () => {
    if (isAnalyzing) return;

    const image = captureImage();
    if (!image) return;

    setIsAnalyzing(true);
    setLastImage(image);

    const startTime = Date.now();

    try {
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        setVlmStatus("error");
        throw new Error(`API error: ${response.status}`);
      }

      setVlmStatus("connected");
      const data = await response.json();

      const result: AnalysisResult = {
        timestamp: new Date(),
        waving: data.waving,
        confidence: data.confidence,
        reason: data.reason,
        latencyMs,
        rawResponse: data.rawResponse,
      };

      setResults((prev) => [result, ...prev].slice(0, 20)); // Keep last 20
    } catch (error) {
      console.error("Analysis error:", error);
      const result: AnalysisResult = {
        timestamp: new Date(),
        waving: false,
        confidence: 0,
        reason: "Error: " + (error instanceof Error ? error.message : "Unknown"),
        latencyMs: Date.now() - startTime,
      };
      setResults((prev) => [result, ...prev].slice(0, 20));
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureImage, isAnalyzing]);

  // Auto mode
  useEffect(() => {
    if (!autoMode) return;

    const intervalId = setInterval(() => {
      analyzeImage();
    }, intervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [autoMode, intervalSeconds, analyzeImage]);

  const latestResult = results[0];
  const avgLatency = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length)
    : 0;
  const detectionRate = results.length > 0
    ? Math.round((results.filter((r) => r.waving).length / results.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/control"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-semibold">Vision Test</h1>
        </div>

        {/* VLM Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800">
          <span
            className={`w-2 h-2 rounded-full ${
              vlmStatus === "connected"
                ? "bg-green-500"
                : vlmStatus === "error"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-sm text-white/70">
            VLM: {vlmStatus === "connected" ? "Connected" : vlmStatus === "error" ? "Error" : "Unknown"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Camera & Controls */}
        <div className="space-y-4">
          {/* Camera View */}
          <div className="relative bg-zinc-900 rounded-xl overflow-hidden">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full aspect-video object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay */}
                {latestResult && (
                  <div
                    className={`absolute top-4 right-4 px-3 py-2 rounded-lg ${
                      latestResult.waving
                        ? "bg-green-500/90 text-white"
                        : "bg-zinc-800/90 text-white/70"
                    }`}
                  >
                    {latestResult.waving ? "Waving Detected!" : "No Wave"}
                  </div>
                )}

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="px-4 py-2 rounded-lg bg-zinc-800 text-white">
                      Analyzing...
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-white/50">
                Camera not available
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
            <div className="flex gap-3">
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing || !hasCamera}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-white/30 transition-colors font-medium"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Now"}
              </button>

              <button
                onClick={() => setAutoMode(!autoMode)}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                  autoMode
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-zinc-700 hover:bg-zinc-600"
                }`}
              >
                {autoMode ? "Auto: ON" : "Auto: OFF"}
              </button>
            </div>

            {/* Interval Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>Interval</span>
                <span>{intervalSeconds}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{avgLatency}ms</div>
                <div className="text-xs text-white/50">Avg Latency</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{detectionRate}%</div>
                <div className="text-xs text-white/50">Detection Rate</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{results.length}</div>
                <div className="text-xs text-white/50">Samples</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Last Captured Image */}
          {lastImage && (
            <div className="bg-zinc-900 rounded-xl p-4">
              <h2 className="text-sm font-medium text-white/70 mb-3">Last Captured</h2>
              <img
                src={lastImage}
                alt="Last captured"
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* Results Log */}
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-white/70">Results Log</h2>
              {results.length > 0 && (
                <button
                  onClick={() => setResults([])}
                  className="text-xs text-white/50 hover:text-white/70"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center text-white/30 py-8">
                  No results yet. Click &quot;Analyze Now&quot; to start.
                </div>
              ) : (
                results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      result.waving ? "bg-green-500/20" : "bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            result.waving ? "bg-green-500" : "bg-zinc-500"
                          }`}
                        />
                        <span className="font-medium">
                          {result.waving ? "Waving" : "No Wave"}
                        </span>
                      </div>
                      <span className="text-xs text-white/50">
                        {result.latencyMs}ms
                      </span>
                    </div>
                    <div className="text-sm text-white/60">
                      Confidence: {(result.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {result.reason}
                    </div>
                    {result.rawResponse && (
                      <details className="mt-2">
                        <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50">
                          Raw Response
                        </summary>
                        <pre className="text-xs text-white/40 mt-1 p-2 bg-zinc-900 rounded overflow-x-auto whitespace-pre-wrap">
                          {result.rawResponse}
                        </pre>
                      </details>
                    )}
                    <div className="text-xs text-white/30 mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
