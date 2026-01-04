import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export type Locale = "ja" | "en";

export interface AppConfig {
  app: {
    locale: Locale;
  };
}

let cachedConfig: AppConfig | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.APP_CONFIG) {
    return path.join(configDir, process.env.APP_CONFIG);
  }

  return path.join(configDir, "app.yaml");
}

export function loadAppConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[App] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    console.log("[App] Config file not found, using defaults");
    return {
      app: {
        locale: "ja",
      },
    };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as AppConfig;

  return cachedConfig;
}

export function getLocale(): Locale {
  // Environment variable takes precedence
  const envLocale = process.env.LOCALE;
  if (envLocale === "ja" || envLocale === "en") {
    return envLocale;
  }

  const config = loadAppConfig();
  return config.app.locale;
}

export function clearAppConfigCache(): void {
  cachedConfig = null;
}
