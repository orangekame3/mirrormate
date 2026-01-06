"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface InfoCard {
  id: string;
  type: "weather" | "calendar" | "time" | "reminder" | "discord" | "search";
  title: string;
  items: string[];
  urgent?: boolean;
}

interface FloatingInfoProps {
  cards: InfoCard[];
  onDismiss: (id: string) => void;
  autoHideDuration?: number;
}

export function FloatingInfo({ cards, onDismiss, autoHideDuration = 8000 }: FloatingInfoProps) {
  const [history, setHistory] = useState<InfoCard[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Track dismissed cards in history (max 3)
  const handleDismiss = useCallback(
    (id: string) => {
      const card = cards.find((c) => c.id === id);
      if (card) {
        setHistory((prev) => [card, ...prev].slice(0, 3));
      }
      onDismiss(id);
    },
    [cards, onDismiss]
  );

  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end gap-3 z-10">
      {/* Active Cards */}
      {cards.map((card) => (
        <InfoCardComponent
          key={card.id}
          card={card}
          onDismiss={() => handleDismiss(card.id)}
          autoHideDuration={autoHideDuration}
        />
      ))}

      {/* History Tray Handle */}
      {history.length > 0 && (
        <div className="relative">
          <button
            className="text-white/30 hover:text-white/50 transition-colors text-sm tracking-widest px-2 py-1"
            onClick={() => setShowHistory(!showHistory)}
            aria-label="Toggle history"
          >
            •••
          </button>

          {/* History Tray */}
          {showHistory && (
            <div className="absolute right-0 top-full mt-2 flex flex-col gap-2">
              {history.map((card) => (
                <HistoryCard key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCardComponent({
  card,
  onDismiss,
  autoHideDuration,
}: {
  card: InfoCard;
  onDismiss: () => void;
  autoHideDuration: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const onDismissRef = useRef(onDismiss);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep onDismiss ref up to date
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    if (!isPinned) {
      // Progress animation
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
        setProgress(remaining);
      }, 50);

      // Auto-hide after duration
      timerRef.current = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => onDismissRef.current(), 260);
      }, autoHideDuration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoHideDuration, isPinned]);

  // Handle pin toggle
  const togglePin = useCallback(() => {
    setIsPinned((prev) => {
      if (!prev) {
        // Pinning: stop auto-hide
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(100);
      } else {
        // Unpinning: restart auto-hide
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
          setProgress(remaining);
        }, 50);
        timerRef.current = setTimeout(() => {
          setIsLeaving(true);
          setTimeout(() => onDismissRef.current(), 260);
        }, autoHideDuration);
      }
      return !prev;
    });
  }, [autoHideDuration]);

  const getIcon = () => {
    switch (card.type) {
      case "weather":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        );
      case "calendar":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case "time":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "reminder":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case "discord":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case "search":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  const icon = getIcon();

  return (
    <div
      className={`
        glass-card ${isPinned ? "glass-card--pinned" : ""}
        ${card.urgent ? "card-urgent" : ""}
        rounded-xl p-4 min-w-[200px] max-w-[280px]
        transition-all duration-[260ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden
        ${isVisible && !isLeaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[10px]"}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-white/60 ${card.urgent ? "animate-bounce" : ""}`}>{icon}</span>
          <span className="text-white/80 text-sm font-medium">{card.title}</span>
        </div>
        {/* Pin Button */}
        <button
          onClick={togglePin}
          className={`p-1 transition-colors ${isPinned ? "text-white/60" : "text-white/30 hover:text-white/50"}`}
          aria-label={isPinned ? "Unpin" : "Pin"}
        >
          <svg className="w-3.5 h-3.5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
      <ul className="space-y-1 mb-3">
        {card.items.map((item, index) => (
          <li key={index} className="text-white/60 text-xs leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
      {/* Progress bar - only show when not pinned */}
      {!isPinned && (
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/40 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function HistoryCard({ card }: { card: InfoCard }) {
  return (
    <div className="glass-card rounded-lg p-3 min-w-[180px] max-w-[240px] opacity-60">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-white/50 text-xs">{card.title}</span>
      </div>
      <p className="text-white/40 text-xs truncate">{card.items[0]}</p>
    </div>
  );
}

// Helper function to detect info type from AI response
export function detectInfoFromResponse(response: string): InfoCard | null {
  const id = crypto.randomUUID();

  // Note: Discord detection is handled via discordShared flag from API response
  // to avoid false positives when LLM says "I'll send to Discord" before actually sending

  // Weather detection
  const weatherPatterns = [
    /天気[はが：:].+?[。、]/,
    /気温[はが：:].+?[。、℃度]/,
    /(\d+)°?C/,
    /(晴|曇|雨|雪|くもり)/,
  ];

  const hasWeather = weatherPatterns.some((pattern) => pattern.test(response));

  if (hasWeather) {
    // Extract weather info
    const lines = response.split(/[。\n]/).filter((line) => {
      return weatherPatterns.some((pattern) => pattern.test(line));
    });

    if (lines.length > 0) {
      return {
        id,
        type: "weather",
        title: "Weather",
        items: lines.slice(0, 3).map((line) => line.trim()),
      };
    }
  }

  // Calendar detection
  const calendarPatterns = [
    /予定[はが：:]/,
    /スケジュール/,
    /\d{1,2}[：:]\d{2}/,
    /ミーティング|会議|打ち合わせ/,
  ];

  const hasCalendar = calendarPatterns.some((pattern) => pattern.test(response));

  if (hasCalendar) {
    // Extract schedule items
    const timePattern = /(\d{1,2}[：:]\d{2})\s*(.+?)(?=[、。\n]|$)/g;
    const items: string[] = [];
    let match;

    while ((match = timePattern.exec(response)) !== null) {
      items.push(`${match[1]} ${match[2].trim()}`);
    }

    // If no time-based items found, extract general schedule lines
    if (items.length === 0) {
      const lines = response.split(/[。\n]/).filter((line) => {
        return calendarPatterns.some((pattern) => pattern.test(line));
      });
      items.push(...lines.slice(0, 3).map((line) => line.trim()));
    }

    if (items.length > 0) {
      return {
        id,
        type: "calendar",
        title: "Today's Schedule",
        items: items.slice(0, 5),
      };
    }
  }

  // Time detection
  const timePatterns = [
    /現在.{0,5}時刻/,
    /今.{0,3}(\d{1,2}時|\d{1,2}[：:]\d{2})/,
    /(\d{1,2})月(\d{1,2})日.{0,5}（[日月火水木金土]）/,
    /\d{4}年\d{1,2}月\d{1,2}日/,
  ];

  const hasTime = timePatterns.some((pattern) => pattern.test(response));

  if (hasTime) {
    // Extract time/date info
    const items: string[] = [];

    // Extract date
    const dateMatch = response.match(/(\d{4}年)?(\d{1,2}月\d{1,2}日)[（(]?([日月火水木金土])[）)]?/);
    if (dateMatch) {
      const year = dateMatch[1] || "";
      items.push(`${year}${dateMatch[2]}（${dateMatch[3]}）`);
    }

    // Extract time
    const timeMatch = response.match(/(\d{1,2})[時：:](\d{2})?分?/);
    if (timeMatch) {
      const hour = timeMatch[1];
      const minute = timeMatch[2] || "00";
      items.push(`${hour}:${minute}`);
    }

    // If no structured match, extract lines mentioning time
    if (items.length === 0) {
      const lines = response.split(/[。\n]/).filter((line) => {
        return timePatterns.some((pattern) => pattern.test(line));
      });
      items.push(...lines.slice(0, 2).map((line) => line.trim()));
    }

    if (items.length > 0) {
      return {
        id,
        type: "time",
        title: "Current Time",
        items,
      };
    }
  }

  return null;
}
