export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required: string[];
  };
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Info card that tools can return for UI display
export interface ToolInfoCard {
  type: "weather" | "calendar" | "time" | "reminder" | "discord" | "search";
  title: string;
  items: string[];
}

export interface ToolExecuteResult {
  result: string;
  infoCard?: ToolInfoCard;
}

export interface ToolResult {
  name: string;
  result: string;
  infoCard?: ToolInfoCard;
}

export interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string | ToolExecuteResult>;
}
