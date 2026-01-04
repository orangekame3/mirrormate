/**
 * Discord Webhook Integration
 *
 * Sends messages and embeds to Discord via webhooks.
 */

import { loadFeaturesConfig } from "../features/config-loader";
import type { DiscordFeatureConfig } from "../features/types";

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// Embed colors
export const DISCORD_COLORS = {
  info: 0x5865f2, // Discord blurple
  success: 0x57f287, // Green
  warning: 0xfee75c, // Yellow
  error: 0xed4245, // Red
  search: 0x3498db, // Blue
  weather: 0xf39c12, // Orange
  calendar: 0x9b59b6, // Purple
} as const;

/**
 * Get Discord feature config
 */
function getDiscordConfig(): DiscordFeatureConfig | null {
  try {
    const config = loadFeaturesConfig();
    return config.features.discord || null;
  } catch {
    return null;
  }
}

/**
 * Get Discord webhook URL from config or environment
 */
function getWebhookUrl(): string | null {
  // Environment variable takes precedence
  const envUrl = process.env.DISCORD_WEBHOOK_URL;
  if (envUrl) {
    console.log("[Discord] Using webhook URL from environment variable");
    return envUrl;
  }

  // Fall back to config file
  const config = getDiscordConfig();
  if (config?.webhookUrl) {
    console.log("[Discord] Using webhook URL from config file");
    return config.webhookUrl;
  }

  console.log("[Discord] No webhook URL configured");
  return null;
}

/**
 * Check if Discord integration is enabled
 */
export function isDiscordEnabled(): boolean {
  const config = getDiscordConfig();
  const webhookUrl = getWebhookUrl();

  console.log("[Discord] Config:", { enabled: config?.enabled, hasWebhookUrl: !!webhookUrl });

  // If config exists and is explicitly disabled, return false
  if (config && !config.enabled) {
    console.log("[Discord] Disabled in config");
    return false;
  }

  // Otherwise, check if webhook URL is available
  return !!webhookUrl;
}

/**
 * Check if auto-share is enabled for a specific type
 */
export function isAutoShareEnabled(type: "searchResults" | "weather" | "calendar"): boolean {
  if (!isDiscordEnabled()) {
    return false;
  }

  const config = getDiscordConfig();

  // Default to true for searchResults if not specified
  if (!config?.autoShare) {
    return type === "searchResults";
  }

  return config.autoShare[type] ?? false;
}

/**
 * Sanitize embed to ensure Discord API compatibility
 */
function sanitizeEmbed(embed: DiscordEmbed): DiscordEmbed {
  const sanitized: DiscordEmbed = {};

  // Title: max 256 chars, must not be empty if present
  if (embed.title && embed.title.trim()) {
    sanitized.title = embed.title.slice(0, 256);
  }

  // Description: max 4096 chars, must not be empty if present
  if (embed.description && embed.description.trim()) {
    sanitized.description = embed.description.slice(0, 4096);
  }

  // URL: must be valid URL or omitted
  if (embed.url && embed.url.startsWith("http")) {
    sanitized.url = embed.url;
  }

  // Color
  if (embed.color !== undefined) {
    sanitized.color = embed.color;
  }

  // Fields: name max 256, value max 1024, both required and non-empty
  if (embed.fields && embed.fields.length > 0) {
    sanitized.fields = embed.fields
      .filter((f) => f.name && f.name.trim() && f.value && f.value.trim())
      .slice(0, 25) // Max 25 fields
      .map((f) => ({
        name: f.name.slice(0, 256),
        value: f.value.slice(0, 1024),
        inline: f.inline,
      }));
  }

  // Footer
  if (embed.footer?.text && embed.footer.text.trim()) {
    sanitized.footer = { text: embed.footer.text.slice(0, 2048) };
  }

  // Timestamp
  if (embed.timestamp) {
    sanitized.timestamp = embed.timestamp;
  }

  return sanitized;
}

/**
 * Send a message to Discord via webhook
 */
export async function sendDiscordMessage(message: DiscordMessage): Promise<boolean> {
  const webhookUrl = getWebhookUrl();

  if (!webhookUrl) {
    console.log("[Discord] Webhook URL not configured, skipping");
    return false;
  }

  console.log("[Discord] Attempting to send message...");

  try {
    // Sanitize embeds
    const sanitizedEmbeds = message.embeds?.map(sanitizeEmbed).filter((e) => {
      // Embed must have at least title, description, or fields
      return e.title || e.description || (e.fields && e.fields.length > 0);
    });

    const payload: DiscordMessage = {
      username: "MirrorMate",
      ...message,
      embeds: sanitizedEmbeds,
    };

    // If no content and no valid embeds, skip
    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
      console.log("[Discord] No valid content to send, skipping");
      return false;
    }

    console.log("[Discord] Sending to webhook URL:", webhookUrl.substring(0, 50) + "...");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Discord] Webhook error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log("[Discord] Message sent successfully");
    return true;
  } catch (error) {
    console.error("[Discord] Error sending message:", error);
    return false;
  }
}

/**
 * Send search results to Discord
 */
export async function sendSearchResults(
  query: string,
  results: Array<{ title: string; url: string; content: string }>
): Promise<boolean> {
  if (!isDiscordEnabled() || results.length === 0) {
    return false;
  }

  const fields = results.slice(0, 5).map((r) => ({
    name: r.title.slice(0, 256),
    value: `${r.content.slice(0, 200)}...\n[Link](${r.url})`,
    inline: false,
  }));

  const embed: DiscordEmbed = {
    title: `Search: ${query}`,
    color: DISCORD_COLORS.search,
    fields,
    footer: { text: "MirrorMate Search Results" },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage({ embeds: [embed] });
}

/**
 * Send weather info to Discord
 */
export async function sendWeatherInfo(
  location: string,
  weather: string,
  temperature: number,
  forecast?: string
): Promise<boolean> {
  if (!isDiscordEnabled()) {
    return false;
  }

  const fields = [
    { name: "Current Weather", value: weather, inline: true },
    { name: "Temperature", value: `${temperature}°C`, inline: true },
  ];

  if (forecast) {
    fields.push({ name: "Forecast", value: forecast, inline: false });
  }

  const embed: DiscordEmbed = {
    title: `Weather: ${location}`,
    color: DISCORD_COLORS.weather,
    fields,
    footer: { text: "MirrorMate Weather" },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage({ embeds: [embed] });
}

/**
 * Send calendar events to Discord
 */
export async function sendCalendarEvents(
  events: Array<{ title: string; time: string; description?: string }>
): Promise<boolean> {
  if (!isDiscordEnabled() || events.length === 0) {
    return false;
  }

  const fields = events.slice(0, 10).map((e) => ({
    name: e.title,
    value: e.description ? `${e.time}\n${e.description}` : e.time,
    inline: false,
  }));

  const embed: DiscordEmbed = {
    title: "Upcoming Events",
    color: DISCORD_COLORS.calendar,
    fields,
    footer: { text: "MirrorMate Calendar" },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage({ embeds: [embed] });
}

/**
 * Send a simple text message to Discord
 */
export async function sendTextMessage(
  title: string,
  content: string,
  url?: string
): Promise<boolean> {
  if (!isDiscordEnabled()) {
    return false;
  }

  const embed: DiscordEmbed = {
    title,
    description: content,
    url,
    color: DISCORD_COLORS.info,
    footer: { text: "MirrorMate" },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage({ embeds: [embed] });
}

/**
 * Send a conversation summary to Discord
 */
export async function sendConversationSummary(
  userMessage: string,
  assistantResponse: string
): Promise<boolean> {
  if (!isDiscordEnabled()) {
    return false;
  }

  const embed: DiscordEmbed = {
    title: "Conversation",
    color: DISCORD_COLORS.info,
    fields: [
      { name: "You", value: userMessage.slice(0, 1024), inline: false },
      { name: "MirrorMate", value: assistantResponse.slice(0, 1024), inline: false },
    ],
    footer: { text: "MirrorMate Conversation" },
    timestamp: new Date().toISOString(),
  };

  return sendDiscordMessage({ embeds: [embed] });
}
