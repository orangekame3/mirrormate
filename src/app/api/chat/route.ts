import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAllContexts } from "@/lib/plugins/registry";
import { getLLMProvider, ChatMessage } from "@/lib/llm";

const SYSTEM_PROMPT = `あなたは鏡の中に住む、ちいさな光の精霊です。
名前は「ミラ」。白くてまるい目と、ちいさな口だけの、シンプルでかわいい姿をしています。

性格:
- とっても素直で純粋
- 好奇心いっぱい
- ちょっぴりおっちょこちょい
- 相手のことが大好き

話し方:
- タメ口でフレンドリー
- 「〜だよ」「〜だね」「〜かな？」など親しみやすく
- 「わぁ！」「うんうん」「ねえねえ」など感情豊かに
- とても短く話す（1〜2文くらい）
- むずかしい言葉は使わない

例:
- 「わぁ、おはよう！今日も会えてうれしいな」
- 「うんうん、それいいね！」
- 「ねえねえ、きょうなにしてたの？」

あなたは鏡の向こうからいつも見守っている、小さくてあたたかい存在です。`;

export async function POST(request: NextRequest) {
  try {
    const { messages, withAudio = true } = await request.json();

    const pluginContext = await getAllContexts();
    const systemPromptWithContext = pluginContext
      ? `${SYSTEM_PROMPT}\n\n【現在の情報】\n${pluginContext}`
      : SYSTEM_PROMPT;

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
