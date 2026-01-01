import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAllContexts } from "@/lib/plugins/registry";
import { getLLMProvider, ChatMessage } from "@/lib/llm";
import { getSystemPrompt } from "@/lib/character";
import { getToolDefinitions, executeTool, getPendingEffect, clearPendingEffect } from "@/lib/tools";
import { executeRule, formatRuleContext } from "@/lib/rules";

const MAX_TOOL_ITERATIONS = 3;

export async function POST(request: NextRequest) {
  try {
    const { messages, withAudio = true } = await request.json();

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

    // Add rule context if matched (takes priority)
    if (ruleContext) {
      contexts.push(ruleContext);
    } else {
      // Use regular plugin context if no rule matched
      const pluginContext = await getAllContexts();
      if (pluginContext) {
        contexts.push("【現在の情報】");
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
      });
    }

    return NextResponse.json({
      message: assistantMessage,
      effect,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
