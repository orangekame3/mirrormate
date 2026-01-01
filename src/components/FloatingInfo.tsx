"use client";

import { useEffect, useState, useRef } from "react";

export interface InfoCard {
  id: string;
  type: "weather" | "calendar" | "time" | "reminder";
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
  return (
    <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
      {cards.map((card) => (
        <InfoCardComponent
          key={card.id}
          card={card}
          onDismiss={() => onDismiss(card.id)}
          autoHideDuration={autoHideDuration}
        />
      ))}
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
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const onDismissRef = useRef(onDismiss);

  // Keep onDismiss ref up to date
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Progress animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismissRef.current(), 300);
    }, autoHideDuration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [autoHideDuration]); // Only depend on autoHideDuration

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
    }
  };

  const getStyles = () => {
    switch (card.type) {
      case "weather":
        return {
          bgColor: "from-sky-500/20 to-blue-500/20",
          borderColor: "border-sky-500/30",
          iconColor: "text-sky-400",
        };
      case "calendar":
        return {
          bgColor: "from-violet-500/20 to-purple-500/20",
          borderColor: "border-violet-500/30",
          iconColor: "text-violet-400",
        };
      case "time":
        return {
          bgColor: "from-amber-500/20 to-orange-500/20",
          borderColor: "border-amber-500/30",
          iconColor: "text-amber-400",
        };
      case "reminder":
        return card.urgent
          ? {
              bgColor: "from-red-500/30 to-rose-500/30",
              borderColor: "border-red-500/50",
              iconColor: "text-red-400",
            }
          : {
              bgColor: "from-emerald-500/20 to-teal-500/20",
              borderColor: "border-emerald-500/30",
              iconColor: "text-emerald-400",
            };
    }
  };

  const icon = getIcon();
  const { bgColor, borderColor, iconColor } = getStyles();

  // Progress bar color based on type
  const getProgressColor = () => {
    switch (card.type) {
      case "weather":
        return "bg-sky-400";
      case "calendar":
        return "bg-violet-400";
      case "time":
        return "bg-amber-400";
      case "reminder":
        return card.urgent ? "bg-red-400" : "bg-emerald-400";
    }
  };

  return (
    <div
      className={`
        bg-gradient-to-br ${bgColor} backdrop-blur-md
        border ${borderColor} rounded-xl p-4 min-w-[200px] max-w-[280px]
        shadow-lg shadow-black/20
        transition-all duration-300 ease-out overflow-hidden
        ${isVisible && !isLeaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
        ${card.urgent ? "animate-pulse" : ""}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`${iconColor} ${card.urgent ? "animate-bounce" : ""}`}>{icon}</span>
        <span className="text-white/80 text-sm font-medium">{card.title}</span>
      </div>
      <ul className="space-y-1 mb-3">
        {card.items.map((item, index) => (
          <li key={index} className="text-white/60 text-xs leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Helper function to detect info type from AI response
export function detectInfoFromResponse(response: string): InfoCard | null {
  const id = crypto.randomUUID();

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
