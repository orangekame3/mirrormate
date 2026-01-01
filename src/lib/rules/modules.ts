import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import dns from "dns";
import { ModulesConfig, ModuleConfig, RuleAction, ModuleResult } from "./types";
import { getPluginContext } from "../plugins/registry";
import { executeTool } from "../tools";

// Force IPv4 first
dns.setDefaultResultOrder("ipv4first");

let cachedConfig: ModulesConfig | null = null;

function loadModulesConfig(): ModulesConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), "config", "modules.yaml");

  if (!fs.existsSync(configPath)) {
    return { modules: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as ModulesConfig;

  return cachedConfig;
}

async function fetchTodayInfo(): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  try {
    // Fetch today's events from Wikipedia API
    const url = `https://ja.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "mirrormate-bot/1.0",
      },
    });

    if (!response.ok) {
      return `${month}月${day}日`;
    }

    const data = await response.json();
    const events = data.events || [];

    if (events.length === 0) {
      return `${month}月${day}日`;
    }

    // Pick one recent event
    const recentEvent = events[0];
    const year = recentEvent.year || "";
    const text = recentEvent.text || "";

    return `今日${month}月${day}日は、${year}年に「${text}」があった日です。`;
  } catch (error) {
    console.error("[TodayInfo] Error:", error);
    return `${month}月${day}日`;
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
      case "plugin": {
        const pluginName = moduleConfig.config.plugin;
        if (!pluginName) {
          return { module: action.module, content: "" };
        }
        const content = await getPluginContext(pluginName);
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
