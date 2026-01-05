"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Speaker {
  id: number;
  name: string;
  styleName: string;
}

interface UseSpeakerSelectorReturn {
  speakers: Speaker[];
  selectedSpeaker: number | null;
  setSelectedSpeaker: (id: number) => void;
  isLoading: boolean;
  error: string | null;
  previewVoice: (speakerId: number, text?: string) => Promise<void>;
  isPreviewPlaying: boolean;
}

const STORAGE_KEY = "mirrormate:speaker";
const DEFAULT_PREVIEW_TEXT = "こんにちは、私の声はこんな感じです。";

export function useSpeakerSelector(): UseSpeakerSelectorReturn {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeakerState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const settingsLoadedRef = useRef(false);

  // Load speakers from API
  useEffect(() => {
    async function fetchSpeakers() {
      try {
        const response = await fetch("/api/voicevox/speakers");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setSpeakers([]);
        } else {
          setSpeakers(data.speakers || []);
          setError(null);
        }
      } catch {
        setError("Failed to fetch speakers");
        setSpeakers([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSpeakers();
  }, []);

  // Load selected speaker from DB (with localStorage fallback)
  useEffect(() => {
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.speakerId !== null && data.speakerId !== undefined) {
            setSelectedSpeakerState(data.speakerId);
            localStorage.setItem(STORAGE_KEY, data.speakerId.toString());
            return;
          }
        }
      } catch {
        // Fall back to localStorage
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          setSelectedSpeakerState(parsed);
        }
      }
    }

    loadSettings();
  }, []);

  const setSelectedSpeaker = useCallback((id: number) => {
    setSelectedSpeakerState(id);
    localStorage.setItem(STORAGE_KEY, id.toString());

    // Save to DB
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speakerId: id }),
    }).catch(() => {
      // Ignore DB errors, localStorage is the backup
    });

    // Notify other tabs via BroadcastChannel
    try {
      const channel = new BroadcastChannel("mirror-channel");
      channel.postMessage({
        type: "settings_changed",
        payload: JSON.stringify({ speaker: id }),
      });
      channel.close();
    } catch {
      // BroadcastChannel not supported
    }
  }, []);

  const previewVoice = useCallback(async (speakerId: number, text?: string) => {
    if (isPreviewPlaying) return;

    setIsPreviewPlaying(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text || DEFAULT_PREVIEW_TEXT,
          speaker: speakerId,
        }),
      });

      if (!response.ok) {
        throw new Error("TTS failed");
      }

      const data = await response.json();

      if (data.audio) {
        // Stop any existing audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPreviewPlaying(false);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setIsPreviewPlaying(false);
          audioRef.current = null;
        };

        await audio.play();
      }
    } catch {
      console.error("Preview failed");
      setIsPreviewPlaying(false);
    }
  }, [isPreviewPlaying]);

  return {
    speakers,
    selectedSpeaker,
    setSelectedSpeaker,
    isLoading,
    error,
    previewVoice,
    isPreviewPlaying,
  };
}
