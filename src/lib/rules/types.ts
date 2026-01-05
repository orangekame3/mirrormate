export interface ModuleConfig {
  type: "feature" | "tool" | "api" | "static";
  description: string;
  config: {
    feature?: string;
    tool?: string;
    source?: string;
    message?: string;
  };
}

export interface ModulesConfig {
  modules: Record<string, ModuleConfig>;
}

export interface RuleAction {
  module: string;
  params?: Record<string, unknown>;
}

export type EffectType = "confetti" | "none";

export interface ContextTrigger {
  feature: string;
  condition: string;
}

export interface RuleTriggers {
  keywords?: string[];
  context?: ContextTrigger;
}

export interface Rule {
  description: string;
  triggers: RuleTriggers;
  actions: RuleAction[];
  response_hint: string;
  effect?: EffectType;
}

export interface RulesConfig {
  rules: Record<string, Rule>;
}

export interface RuleMatch {
  rule: Rule;
  ruleName: string;
  triggeredKeyword?: string;
  triggeredContext?: ContextTrigger;
}

export interface ModuleResult {
  module: string;
  content: string;
}
