"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface VisionCompanionConfig {
  cameraWidth?: number;
  cameraHeight?: number;
  showDebug?: boolean;
}

interface VisionCompanionProps {
  config?: VisionCompanionConfig;
}

// Default configuration
const DEFAULT_CONFIG: Required<VisionCompanionConfig> = {
  cameraWidth: 640,
  cameraHeight: 360,
  showDebug: false,
};

export function VisionCompanion({ config }: VisionCompanionProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

  // Capture image from video
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

  // Listen for camera capture requests from control panel
  useEffect(() => {
    const channel = new BroadcastChannel("mirror-channel");

    channel.onmessage = (event) => {
      if (event.data.type === "camera_capture_request") {
        // Capture current frame and send back
        const image = captureImage();
        if (image) {
          console.log("[VisionCompanion] Camera capture requested, sending image");
          channel.postMessage({
            type: "camera_capture_response",
            payload: image,
          });
        } else {
          console.warn("[VisionCompanion] Camera capture failed - no image available");
          channel.postMessage({
            type: "camera_capture_response",
            payload: null,
          });
        }
      }
    };

    return () => {
      channel.close();
    };
  }, [captureImage]);

  // Start camera stream
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: mergedConfig.cameraWidth },
            height: { ideal: mergedConfig.cameraHeight },
            facingMode: "user",
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsInitialized(true);
          console.log("[VisionCompanion] Camera started");
          if (mergedConfig.showDebug) {
            setDebugInfo("Camera ready");
          }
        }
      } catch (error) {
        console.error("[VisionCompanion] Camera access denied:", error);
        setHasCamera(false);
        if (mergedConfig.showDebug) {
          setDebugInfo("Camera denied");
        }
      }
    }

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mergedConfig.cameraWidth, mergedConfig.cameraHeight, mergedConfig.showDebug]);

  // Hidden elements for camera capture
  if (!mergedConfig.showDebug) {
    return (
      <>
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </>
    );
  }

  // Debug view
  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-40 h-30 rounded-lg opacity-70"
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] px-2 py-1 rounded-b-lg">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isInitialized && hasCamera ? "bg-green-500" : "bg-gray-500"}`}
          />
          <span className="truncate">{debugInfo}</span>
        </div>
      </div>
    </div>
  );
}

export default VisionCompanion;
