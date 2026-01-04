import { Tool, ToolDefinition, ToolCall, ToolResult, ToolInfoCard } from "./types";
import { webSearchTool } from "./web-search";
import { effectTool, getPendingEffect, clearPendingEffect } from "./effects";
import { discordShareTool } from "./discord-share";

export type { Tool, ToolDefinition, ToolCall, ToolResult, ToolInfoCard };
export { getPendingEffect, clearPendingEffect };

const tools: Tool[] = [webSearchTool, effectTool, discordShareTool];

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map((t) => t.definition);
}

export function getTool(name: string): Tool | undefined {
  return tools.find((t) => t.definition.name === name);
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const tool = getTool(call.name);

  if (!tool) {
    return {
      name: call.name,
      result: `Tool "${call.name}" not found.`,
    };
  }

  const execResult = await tool.execute(call.arguments);

  // Handle both string and ToolExecuteResult return types
  if (typeof execResult === "string") {
    return {
      name: call.name,
      result: execResult,
    };
  }

  return {
    name: call.name,
    result: execResult.result,
    infoCard: execResult.infoCard,
  };
}
