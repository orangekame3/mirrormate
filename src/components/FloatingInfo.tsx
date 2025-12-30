"use client";

import { useEffect, useState } from "react";

export interface InfoCard {
  id: string;
  type: "weather" | "calendar" | "time";
  title: string;
  items: string[];
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

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-hide after duration
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 300);
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onDismiss]);

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
    }
  };

  const icon = getIcon();
  const { bgColor, borderColor, iconColor } = getStyles();

  return (
    <div
      className={`
        bg-gradient-to-br ${bgColor} backdrop-blur-md
        border ${borderColor} rounded-xl p-4 min-w-[200px] max-w-[280px]
        shadow-lg shadow-black/20
        transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-white/80 text-sm font-medium">{card.title}</span>
      </div>
      <ul className="space-y-1">
        {card.items.map((item, index) => (
          <li key={index} className="text-white/60 text-xs leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
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
        title: "天気情報",
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
        title: "今日の予定",
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
        title: "現在時刻",
        items,
      };
    }
  }

  return null;
}
