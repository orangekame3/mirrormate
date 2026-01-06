import OpenAI from "openai";
import {
  STTProvider,
  TranscribeOptions,
  TranscribeResult,
  OpenAIWhisperConfig,
} from "./types";

/**
 * OpenAI Whisper STT Provider
 * Uses OpenAI's audio.transcriptions API for high-quality speech recognition
 */
export class OpenAIWhisperProvider implements STTProvider {
  private client: OpenAI;
  private config: OpenAIWhisperConfig;

  constructor(config: OpenAIWhisperConfig = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "[OpenAIWhisperProvider] OPENAI_API_KEY environment variable is required"
      );
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.config = config;
  }

  getProviderName(): string {
    return "openai-whisper";
  }

  getSupportedFormats(): string[] {
    return ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"];
  }

  async transcribe(
    audio: Buffer,
    options?: TranscribeOptions
  ): Promise<TranscribeResult> {
    const language = options?.language || this.config.language;
    const prompt = options?.prompt || this.config.prompt;
    const temperature = options?.temperature ?? this.config.temperature ?? 0;

    console.log(
      `[OpenAIWhisperProvider] Transcribing audio: ${audio.length} bytes, language: ${language || "auto"}`
    );

    // Create a File object from Buffer for the OpenAI API
    // Convert Buffer to Uint8Array for File compatibility
    const uint8Array = new Uint8Array(audio);
    const file = new File([uint8Array], "audio.webm", { type: "audio/webm" });

    const response = await this.client.audio.transcriptions.create({
      file,
      model: this.config.model || "whisper-1",
      language,
      prompt,
      temperature,
      response_format: "verbose_json",
    });

    console.log(
      `[OpenAIWhisperProvider] Transcription complete: "${response.text.substring(0, 50)}${response.text.length > 50 ? "..." : ""}"`
    );

    return {
      transcript: response.text,
      language: response.language,
      duration: response.duration,
    };
  }
}
