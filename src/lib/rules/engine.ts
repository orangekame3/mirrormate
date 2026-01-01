import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { RulesConfig, Rule, RuleMatch, ModuleResult } from "./types";
import { executeModules } from "./modules";

let cachedConfig: RulesConfig | null = null;

function loadRulesConfig(): RulesConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), "config", "rules.yaml");

  if (!fs.existsSync(configPath)) {
    return { rules: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as RulesConfig;

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

export function formatRuleContext(result: RuleExecutionResult): string {
  if (!result.matched || result.moduleResults.length === 0) {
    return "";
  }

  const sections: string[] = [];

  sections.push("【ルールによる取得情報】");

  for (const moduleResult of result.moduleResults) {
    if (moduleResult.content) {
      sections.push(moduleResult.content);
    }
  }

  if (result.responseHint) {
    sections.push("");
    sections.push("【応答のヒント】");
    sections.push(result.responseHint);
  }

  return sections.join("\n");
}
