import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAllContexts } from "@/lib/features/registry";
import { getLLMProvider, ChatMessage } from "@/lib/llm";
import { getSystemPrompt } from "@/lib/character";
import { getToolDefinitions, executeTool, getPendingEffect, clearPendingEffect, ToolInfoCard } from "@/lib/tools";
import { executeRule, formatRuleContext } from "@/lib/rules";
import { loadProvidersConfig, getEmbeddingProvider } from "@/lib/providers";
import { RAGService, getSimpleContext, MemoryService } from "@/lib/memory";
import { getUserRepository } from "@/lib/repositories";

const MAX_TOOL_ITERATIONS = 3;
const DEFAULT_USER_ID = "default-user";

// RAG service cache
let ragService: RAGService | null = null;
let memoryService: MemoryService | null = null;

function getRAGService(): RAGService | null {
  if (ragService) return ragService;

  const embeddingProvider = getEmbeddingProvider();
  if (!embeddingProvider) return null;

  ragService = new RAGService(embeddingProvider);
  return ragService;
}

function getMemoryService(): MemoryService | null {
  if (memoryService) return memoryService;

  const config = loadProvidersConfig();
  const memoryConfig = config.providers?.memory;

  if (!memoryConfig?.enabled) return null;

  const embeddingProvider = getEmbeddingProvider();
  const llmProvider = getLLMProvider();

  memoryService = new MemoryService({
    llmProvider,
    embeddingProvider: embeddingProvider || undefined,
    minConfidence: memoryConfig.extraction?.minConfidence ?? 0.5,
    autoExtract: memoryConfig.extraction?.autoExtract ?? true,
  });

  return memoryService;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, withAudio = true, userId } = await request.json();

    // Determine user ID (use default if not specified)
    const currentUserId = userId || DEFAULT_USER_ID;

    // Create user if not exists
    const userRepo = getUserRepository();
    await userRepo.findOrCreate(currentUserId);

    // Get the last user message for rule matching
    const lastUserMessage = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop()?.content || "";

    // Check if any rule matches
    const ruleResult = await executeRule(lastUserMessage);
    const ruleContext = formatRuleContext(ruleResult);

    // Build system prompt with contexts
    const systemPrompt = getSystemPrompt();
    const contexts: string[] = [];

    // Get RAG context
    let usedMemoryIds: string[] = [];
    const rag = getRAGService();
    const config = loadProvidersConfig();
    const memoryConfig = config.providers?.memory;

    if (rag && memoryConfig?.enabled) {
      try {
        const ragContext = await rag.retrieve(currentUserId, lastUserMessage, {
          topK: memoryConfig.rag?.topK ?? 8,
          threshold: memoryConfig.rag?.threshold ?? 0.3,
        });
        const formattedContext = rag.formatContext(ragContext);
        if (formattedContext) {
          contexts.push(formattedContext);
        }
        usedMemoryIds = ragContext.usedMemoryIds;
      } catch (error) {
        console.error("[Chat] RAG retrieval failed:", error);
        // Fall back to simple context if RAG fails
        const simpleContext = await getSimpleContext(currentUserId);
        if (simpleContext) {
          contexts.push(simpleContext);
        }
      }
    }

    // Add rule context if matched (takes priority)
    if (ruleContext) {
      contexts.push(ruleContext);
    } else {
      // Use regular plugin context if no rule matched
      const pluginContext = await getAllContexts();
      if (pluginContext) {
        contexts.push("[Current Information]");
        contexts.push(pluginContext);
      }
    }

    const systemPromptWithContext = contexts.length > 0
      ? `${systemPrompt}\n\n${contexts.join("\n")}`
      : systemPrompt;

    const llmProvider = getLLMProvider();

    // Only provide tools if no rule matched (rule already handled the data gathering)
    const tools = ruleResult.matched ? [] : getToolDefinitions();

    let chatMessages: ChatMessage[] = [
      { role: "system", content: systemPromptWithContext },
      ...messages,
    ];

    let assistantMessage = "";
    let iterations = 0;
    let discordShared = false;
    let toolsUsed = false;
    const infoCards: ToolInfoCard[] = [];

    // Clear any pending effects from previous requests
    clearPendingEffect();

    // Tool calling loop
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const result = await llmProvider.chat({
        messages: chatMessages,
        tools: tools.length > 0 ? tools : undefined,
      });

      if (result.finishReason === "stop" || !result.toolCalls || result.toolCalls.length === 0) {
        assistantMessage = result.content;
        break;
      }

      // Process tool calls
      console.log(`[Chat] Processing ${result.toolCalls.length} tool call(s)`);
      toolsUsed = true;

      // Add assistant message with tool calls
      chatMessages.push({
        role: "assistant",
        content: result.content || "",
        tool_calls: result.toolCalls.map((tc) => ({
          id: tc.id || `call_${Date.now()}`,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });

      // Execute tools and add results
      for (const toolCall of result.toolCalls) {
        console.log(`[Chat] Executing tool: ${toolCall.name}`);
        const toolResult = await executeTool(toolCall);

        // Collect info cards from tools
        if (toolResult.infoCard) {
          infoCards.push(toolResult.infoCard);
          // Track Discord share via info card
          if (toolResult.infoCard.type === "discord") {
            discordShared = true;
          }
        }

        chatMessages.push({
          role: "tool",
          content: toolResult.result,
          tool_call_id: toolCall.id || `call_${Date.now()}`,
        });
      }
    }

    // Determine effect: tool-triggered effect takes priority, then rule effect
    const toolEffect = getPendingEffect();
    const effect = toolEffect || ruleResult.effect;

    // Record memory usage & async memory extraction
    const memService = getMemoryService();
    if (memService && usedMemoryIds.length > 0) {
      // Update lastUsedAt for used memories (async)
      memService.touchMemories(usedMemoryIds).catch((err) => {
        console.error("[Chat] Failed to touch memories:", err);
      });
    }

    // Extract memories from conversation (async, non-blocking)
    if (memService && assistantMessage) {
      const conversationMessages = messages
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .slice(-10) // Use last 10 messages for extraction
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      // Add assistant response
      conversationMessages.push({
        role: "assistant" as const,
        content: assistantMessage,
      });

      memService.processConversation(currentUserId, conversationMessages, usedMemoryIds).catch((err) => {
        console.error("[Chat] Memory extraction failed:", err);
      });
    }

    // Generate audio if requested
    if (withAudio && assistantMessage && process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const audioResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "shimmer",
        input: assistantMessage,
        response_format: "mp3",
        speed: 0.95,
      });

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");

      return NextResponse.json({
        message: assistantMessage,
        audio: audioBase64,
        effect,
        discordShared,
        toolsUsed,
        infoCards,
      });
    }

    return NextResponse.json({
      message: assistantMessage,
      effect,
      discordShared,
      toolsUsed,
      infoCards,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
