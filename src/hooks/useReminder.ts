"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface ReminderConfig {
  enabled: boolean;
  pollingInterval: number;
  reminders: Array<{ minutes: number; urgent: boolean }>;
}

export interface Reminder {
  id: string;
  summary: string;
  start: Date;
  minutesUntil: number;
  configuredMinutes: number;
  urgent: boolean;
}

interface UseReminderOptions {
  onReminder?: (reminder: Reminder) => void;
}

export function useReminder({ onReminder }: UseReminderOptions = {}) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const shownRemindersRef = useRef<Set<string>>(new Set());

  // Fetch config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/reminder/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (error) {
        console.error("[useReminder] Error fetching config:", error);
      } finally {
        setIsConfigLoaded(true);
      }
    }
    fetchConfig();
  }, []);

  const checkReminders = useCallback(async () => {
    if (!config?.enabled) return;

    setIsChecking(true);
    try {
      const res = await fetch("/api/reminder");
      if (res.ok) {
        const data = await res.json();

        for (const event of data.reminders) {
          // Create unique ID for this specific reminder (event + configured minutes)
          const reminderId = `${event.summary}-${event.start}-${event.configuredMinutes}min`;

          // Skip if already shown
          if (shownRemindersRef.current.has(reminderId)) {
            continue;
          }

          // Mark as shown
          shownRemindersRef.current.add(reminderId);

          const reminder: Reminder = {
            id: crypto.randomUUID(),
            summary: event.summary,
            start: new Date(event.start),
            minutesUntil: event.minutesUntil,
            configuredMinutes: event.configuredMinutes,
            urgent: event.urgent,
          };

          setReminders((prev) => [...prev, reminder]);

          // Call the callback
          if (onReminder) {
            onReminder(reminder);
          }
        }
      }
    } catch (error) {
      console.error("[useReminder] Error checking reminders:", error);
    } finally {
      setIsChecking(false);
    }
  }, [config?.enabled, onReminder]);

  // Clear a specific reminder
  const dismissReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Clear all reminders
  const clearReminders = useCallback(() => {
    setReminders([]);
  }, []);

  // Reset shown reminders (useful for testing)
  const resetShownReminders = useCallback(() => {
    shownRemindersRef.current.clear();
  }, []);

  // Set up polling after config is loaded
  useEffect(() => {
    if (!isConfigLoaded || !config?.enabled) return;

    // Initial check
    checkReminders();

    // Set up interval (config.pollingInterval is in seconds)
    const intervalMs = (config.pollingInterval || 30) * 1000;
    const interval = setInterval(checkReminders, intervalMs);

    return () => clearInterval(interval);
  }, [isConfigLoaded, config?.enabled, config?.pollingInterval, checkReminders]);

  // Clean up old shown reminders periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (shownRemindersRef.current.size > 100) {
        shownRemindersRef.current.clear();
      }
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(cleanup);
  }, []);

  return {
    reminders,
    isChecking,
    config,
    isConfigLoaded,
    dismissReminder,
    clearReminders,
    resetShownReminders,
    checkReminders,
  };
}
