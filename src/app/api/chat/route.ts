import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAllContexts } from "@/lib/plugins/registry";
import { getLLMProvider, ChatMessage } from "@/lib/llm";
import { getSystemPrompt } from "@/lib/character";

export async function POST(request: NextRequest) {
  try {
    const { messages, withAudio = true } = await request.json();

    const systemPrompt = getSystemPrompt();
    const pluginContext = await getAllContexts();
    const systemPromptWithContext = pluginContext
      ? `${systemPrompt}\n\n【現在の情報】\n${pluginContext}`
      : systemPrompt;

    const llmProvider = getLLMProvider();
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPromptWithContext },
      ...messages,
    ];

    const result = await llmProvider.chat({ messages: chatMessages });
    const assistantMessage = result.content;

    // 音声生成 (TTSはOpenAI固定)
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
      });
    }

    return NextResponse.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
