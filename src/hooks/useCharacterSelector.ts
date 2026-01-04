"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  recommendedVoice?: number;
}

interface UseCharacterSelectorReturn {
  characters: CharacterPreset[];
  selectedCharacter: string | null;
  setSelectedCharacter: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  getSelectedCharacterInfo: () => CharacterPreset | null;
}

const STORAGE_KEY = "mirrormate:character";

export function useCharacterSelector(): UseCharacterSelectorReturn {
  const [characters, setCharacters] = useState<CharacterPreset[]>([]);
  const [selectedCharacter, setSelectedCharacterState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settingsLoadedRef = useRef(false);

  // Load characters from API
  useEffect(() => {
    async function fetchCharacters() {
      try {
        const response = await fetch("/api/characters");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          setCharacters([]);
        } else {
          setCharacters(data.characters || []);
          setError(null);
        }
      } catch {
        setError("Failed to fetch characters");
        setCharacters([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCharacters();
  }, []);

  // Load selected character from DB (with localStorage fallback)
  useEffect(() => {
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.characterId) {
            setSelectedCharacterState(data.characterId);
            localStorage.setItem(STORAGE_KEY, data.characterId);
            return;
          }
        }
      } catch {
        // Fall back to localStorage
      }

      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedCharacterState(stored);
      }
    }

    loadSettings();
  }, []);

  const setSelectedCharacter = useCallback((id: string) => {
    setSelectedCharacterState(id);
    localStorage.setItem(STORAGE_KEY, id);

    // Save to DB
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: id }),
    }).catch(() => {
      // Ignore DB errors, localStorage is the backup
    });

    // Notify other tabs via BroadcastChannel
    try {
      const channel = new BroadcastChannel("mirror-channel");
      channel.postMessage({
        type: "settings_changed",
        payload: JSON.stringify({ characterId: id }),
      });
      channel.close();
    } catch {
      // BroadcastChannel not supported
    }
  }, []);

  const getSelectedCharacterInfo = useCallback((): CharacterPreset | null => {
    if (!selectedCharacter) return null;
    return characters.find((c) => c.id === selectedCharacter) ?? null;
  }, [selectedCharacter, characters]);

  return {
    characters,
    selectedCharacter,
    setSelectedCharacter,
    isLoading,
    error,
    getSelectedCharacterInfo,
  };
}
