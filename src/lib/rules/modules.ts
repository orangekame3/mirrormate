import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import dns from "dns";
import { ModulesConfig, ModuleConfig, RuleAction, ModuleResult } from "./types";
import { getFeatureContext } from "../features/registry";
import { executeTool } from "../tools";
import { getLocale, type Locale } from "../app";

// Force IPv4 first
dns.setDefaultResultOrder("ipv4first");

let cachedConfig: ModulesConfig | null = null;
let cachedLocale: Locale | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");
  const locale = getLocale();
  const localePath = path.join(configDir, "locales", locale, "modules.yaml");
  if (fs.existsSync(localePath)) {
    return localePath;
  }
  // Fallback to root config for backward compatibility
  return path.join(configDir, "modules.yaml");
}

function loadModulesConfig(): ModulesConfig {
  const locale = getLocale();

  // Invalidate cache if locale changed
  if (cachedLocale !== null && cachedLocale !== locale) {
    cachedConfig = null;
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Modules] Loading modules from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    return { modules: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as ModulesConfig;
  cachedLocale = locale;

  return cachedConfig;
}

// Locale-specific Wikipedia API settings
const wikipediaSettings = {
  ja: {
    domain: "ja.wikipedia.org",
    formatDate: (month: number, day: number) => `${month}月${day}日`,
    formatEvent: (month: number, day: number, year: string, text: string) =>
      `今日${month}月${day}日は、${year}年に「${text}」があった日です。`,
  },
  en: {
    domain: "en.wikipedia.org",
    formatDate: (month: number, day: number) => {
      const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      return `${months[month - 1]} ${day}`;
    },
    formatEvent: (month: number, day: number, year: string, text: string) => {
      const months = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      return `Today, ${months[month - 1]} ${day}, is the day when "${text}" happened in ${year}.`;
    },
  },
} as const;

async function fetchTodayInfo(): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const locale = getLocale();
  const settings = wikipediaSettings[locale] || wikipediaSettings.en;

  try {
    // Fetch today's events from Wikipedia API
    const url = `https://${settings.domain}/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mirrormate-bot/1.0",
      },
    });

    if (!response.ok) {
      return settings.formatDate(month, day);
    }

    const data = await response.json();
    const events = data.events || [];

    if (events.length === 0) {
      return settings.formatDate(month, day);
    }

    // Pick one recent event
    const recentEvent = events[0];
    const year = recentEvent.year || "";
    const text = recentEvent.text || "";

    return settings.formatEvent(month, day, year, text);
  } catch (error) {
    console.error("[TodayInfo] Error:", error);
    return settings.formatDate(month, day);
  }
}

export async function executeModule(
  action: RuleAction
): Promise<ModuleResult> {
  const config = loadModulesConfig();
  const moduleConfig = config.modules[action.module];

  if (!moduleConfig) {
    return {
      module: action.module,
      content: `Module "${action.module}" not found`,
    };
  }

  console.log(`[Module] Executing: ${action.module} (${moduleConfig.type})`);

  try {
    switch (moduleConfig.type) {
      case "feature": {
        const featureName = moduleConfig.config.feature;
        if (!featureName) {
          return { module: action.module, content: "" };
        }
        const content = await getFeatureContext(featureName);
        return { module: action.module, content };
      }

      case "tool": {
        const toolName = moduleConfig.config.tool;
        if (!toolName) {
          return { module: action.module, content: "" };
        }
        const params = action.params || {};
        const result = await executeTool({
          name: toolName,
          arguments: params,
        });
        return { module: action.module, content: result.result };
      }

      case "api": {
        const source = moduleConfig.config.source;
        if (source === "wikipedia_api") {
          const content = await fetchTodayInfo();
          return { module: action.module, content };
        }
        return { module: action.module, content: "" };
      }

      case "static": {
        const message = moduleConfig.config.message || "";
        return { module: action.module, content: message };
      }

      default:
        return { module: action.module, content: "" };
    }
  } catch (error) {
    console.error(`[Module] Error executing ${action.module}:`, error);
    return {
      module: action.module,
      content: `Error: ${(error as Error).message}`,
    };
  }
}

export async function executeModules(
  actions: RuleAction[]
): Promise<ModuleResult[]> {
  const results: ModuleResult[] = [];

  for (const action of actions) {
    const result = await executeModule(action);
    if (result.content) {
      results.push(result);
    }
  }

  return results;
}
