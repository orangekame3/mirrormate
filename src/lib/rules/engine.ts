import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { RulesConfig, Rule, RuleMatch, ModuleResult } from "./types";
import { executeModules } from "./modules";
import { getLocale, type Locale } from "../app";

let cachedConfig: RulesConfig | null = null;
let cachedLocale: Locale | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");
  const locale = getLocale();
  const localePath = path.join(configDir, "locales", locale, "rules.yaml");
  if (fs.existsSync(localePath)) {
    return localePath;
  }
  // Fallback to root config for backward compatibility
  return path.join(configDir, "rules.yaml");
}

function loadRulesConfig(): RulesConfig {
  const locale = getLocale();

  // Invalidate cache if locale changed
  if (cachedLocale !== null && cachedLocale !== locale) {
    cachedConfig = null;
  }

  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[RuleEngine] Loading rules from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    return { rules: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as RulesConfig;
  cachedLocale = locale;

  return cachedConfig;
}

export function matchRule(userMessage: string): RuleMatch | null {
  const config = loadRulesConfig();
  const normalizedMessage = userMessage.toLowerCase().trim();

  for (const [ruleName, rule] of Object.entries(config.rules)) {
    for (const keyword of rule.triggers.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        console.log(`[RuleEngine] Matched rule: ${ruleName} (keyword: ${keyword})`);
        return {
          rule,
          ruleName,
          triggeredKeyword: keyword,
        };
      }
    }
  }

  return null;
}

export interface RuleExecutionResult {
  matched: boolean;
  ruleName?: string;
  moduleResults: ModuleResult[];
  responseHint?: string;
  effect?: string;
}

export async function executeRule(userMessage: string): Promise<RuleExecutionResult> {
  const match = matchRule(userMessage);

  if (!match) {
    return {
      matched: false,
      moduleResults: [],
    };
  }

  console.log(`[RuleEngine] Executing rule: ${match.ruleName}`);

  const moduleResults = await executeModules(match.rule.actions);

  return {
    matched: true,
    ruleName: match.ruleName,
    moduleResults,
    responseHint: match.rule.response_hint,
    effect: match.rule.effect,
  };
}

// Locale-specific labels for rule context formatting
const contextLabels = {
  ja: {
    ruleInfo: "【ルールによる取得情報】",
    responseHint: "【応答のヒント】",
  },
  en: {
    ruleInfo: "[Information from Rule]",
    responseHint: "[Response Hint]",
  },
} as const;

export function formatRuleContext(result: RuleExecutionResult): string {
  if (!result.matched || result.moduleResults.length === 0) {
    return "";
  }

  const locale = getLocale();
  const labels = contextLabels[locale] || contextLabels.en;
  const sections: string[] = [];

  sections.push(labels.ruleInfo);

  for (const moduleResult of result.moduleResults) {
    if (moduleResult.content) {
      sections.push(moduleResult.content);
    }
  }

  if (result.responseHint) {
    sections.push("");
    sections.push(labels.responseHint);
    sections.push(result.responseHint);
  }

  return sections.join("\n");
}
