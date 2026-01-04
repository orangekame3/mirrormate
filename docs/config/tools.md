# Tools (Function Calling)

Tools are functions that the LLM can call during conversation using function calling. Unlike plugins (which provide context before the LLM call), tools are invoked by the LLM when needed.

## Available Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the internet using Tavily API |
| `show_effect` | Display visual effects (confetti, hearts, sparkles) |

## Web Search

Allows the AI to search the internet for current information.

### Setup

1. Get an API key from [Tavily](https://tavily.com/)
2. Add to `.env`:

```bash
TAVILY_API_KEY=tvly-your-api-key-here
```

### Usage

The LLM will automatically call this tool when it needs to search for information:

```
User: "最近のAIニュースを教えて"
AI: [calls web_search with query "AI ニュース 最新"]
AI: "最近のAIニュースとして..."
```

### Configuration

No additional configuration required. The tool is automatically available when the API key is set.

### Source Code

`src/lib/tools/web-search.ts`

```typescript
{
  name: "web_search",
  description: "インターネットで情報を検索します。最新のニュースやイベント、事実確認に使用してください。",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "検索クエリ"
      }
    },
    required: ["query"]
  }
}
```

## Visual Effects

Allows the AI to trigger visual effects to express emotions.

### Available Effects

| Effect | Description | Use Case |
|--------|-------------|----------|
| `confetti` | Paper confetti animation | Celebrations, achievements |
| `hearts` | White heart animation | Affection, gratitude |
| `sparkles` | Sparkle animation | Excitement, discoveries |

### Usage

The LLM will call this tool when it wants to express emotion:

```
User: "誕生日なんだ！"
AI: [calls show_effect with effect "confetti"]
AI: "わぁ、お誕生日おめでとう！"
```

### Configuration

No configuration required. The tool is always available.

### Source Code

`src/lib/tools/effects.ts`

```typescript
{
  name: "show_effect",
  description: `画面にエフェクトを表示します。嬉しいとき、お祝いのとき、感動したときなど、感情を表現したいときに使ってください。
- confetti: 紙吹雪（お祝い、嬉しいニュース、達成）
- hearts: ハート（愛情、感謝、応援）
- sparkles: キラキラ（驚き、発見、素敵なこと）`,
  parameters: {
    type: "object",
    properties: {
      effect: {
        type: "string",
        enum: ["confetti", "hearts", "sparkles"]
      },
      reason: {
        type: "string",
        description: "エフェクトを表示する理由（ログ用）"
      }
    },
    required: ["effect"]
  }
}
```

## How Tools Work

### Request Flow

```
1. User message received
        │
        ▼
2. LLM processes with tools available
        │
        ├──► LLM decides to call a tool
        │           │
        │           ▼
        │    Tool executed
        │           │
        │           ▼
        │    Result returned to LLM
        │           │
        │           ▼
        │    LLM generates final response
        │
        └──► LLM generates response directly
```

### Tool Calling Loop

The system allows up to 3 tool calls per request:

```typescript
const MAX_TOOL_ITERATIONS = 3;

while (iterations < MAX_TOOL_ITERATIONS) {
  const result = await llmProvider.chat({
    messages: chatMessages,
    tools: tools,
  });

  if (result.finishReason === "stop") {
    break; // No more tool calls
  }

  // Execute tool and add result to messages
  for (const toolCall of result.toolCalls) {
    const toolResult = await executeTool(toolCall);
    chatMessages.push({ role: "tool", content: toolResult });
  }
}
```

## Creating Custom Tools

### 1. Define the Tool

Create a new file in `src/lib/tools/`:

```typescript
// src/lib/tools/my-tool.ts
import { Tool } from "./types";

export const myTool: Tool = {
  definition: {
    name: "my_tool",
    description: "What this tool does",
    parameters: {
      type: "object",
      properties: {
        param1: {
          type: "string",
          description: "Parameter description"
        }
      },
      required: ["param1"]
    }
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const param1 = args.param1 as string;
    // Do something
    return "Result string for LLM";
  }
};
```

### 2. Register the Tool

Add to `src/lib/tools/index.ts`:

```typescript
import { myTool } from "./my-tool";

const tools: Tool[] = [
  webSearchTool,
  effectTool,
  myTool,  // Add your tool
];
```

### Tool Interface

```typescript
interface Tool {
  definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}
```

## Tools vs Plugins vs Rules

| Feature | Plugins | Tools | Rules |
|---------|---------|-------|-------|
| When executed | Before LLM call | During LLM call | Before LLM call |
| Who decides | Always runs | LLM decides | Trigger match |
| Use case | Context injection | Dynamic actions | Automated workflows |
| Examples | Weather, Calendar | Web search, Effects | Morning greeting |
