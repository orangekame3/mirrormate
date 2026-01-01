import { Tool, ToolDefinition, ToolCall, ToolResult } from "./types";
import { webSearchTool } from "./web-search";
import { effectTool, getPendingEffect, clearPendingEffect } from "./effects";

export type { Tool, ToolDefinition, ToolCall, ToolResult };
export { getPendingEffect, clearPendingEffect };

const tools: Tool[] = [webSearchTool, effectTool];

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
      result: `ツール "${call.name}" は見つかりません。`,
    };
  }

  const result = await tool.execute(call.arguments);
  return {
    name: call.name,
    result,
  };
}
