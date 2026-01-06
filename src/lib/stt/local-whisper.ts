import {
  STTProvider,
  TranscribeOptions,
  TranscribeResult,
  LocalWhisperConfig,
} from "./types";

/**
 * Local Whisper STT Provider
 * Compatible with faster-whisper, whisper.cpp, and other self-hosted Whisper servers
 *
 * Expected API format (compatible with faster-whisper-server):
 * POST /v1/audio/transcriptions
 * Content-Type: multipart/form-data
 * - file: audio file
 * - model: model name (optional)
 * - language: language code (optional)
 *
 * Response:
 * { "text": "transcribed text" }
 */
export class LocalWhisperProvider implements STTProvider {
  private config: LocalWhisperConfig;
  private baseUrl: string;

  constructor(config: LocalWhisperConfig = {}) {
    this.config = config;
    this.baseUrl = config.baseUrl || "http://localhost:8080";

    // Remove trailing slash if present
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  getProviderName(): string {
    return "local-whisper";
  }

  getSupportedFormats(): string[] {
    return ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg"];
  }

  async transcribe(
    audio: Buffer,
    options?: TranscribeOptions
  ): Promise<TranscribeResult> {
    const language = options?.language || this.config.language;
    const model = this.config.model || "base";

    console.log(
      `[LocalWhisperProvider] Transcribing audio: ${audio.length} bytes, model: ${model}, language: ${language || "auto"}`
    );

    // Create FormData with audio file
    const formData = new FormData();
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(audio);
    const blob = new Blob([uint8Array], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");

    if (model) {
      formData.append("model", model);
    }

    if (language) {
      formData.append("language", language);
    }

    // Try OpenAI-compatible endpoint first (faster-whisper-server format)
    const endpoint = `${this.baseUrl}/v1/audio/transcriptions`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Local Whisper API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      // Handle different response formats
      const transcript = data.text || data.transcript || "";

      console.log(
        `[LocalWhisperProvider] Transcription complete: "${transcript.substring(0, 50)}${transcript.length > 50 ? "..." : ""}"`
      );

      return {
        transcript,
        language: data.language,
        duration: data.duration,
      };
    } catch (error) {
      // If OpenAI-compatible endpoint fails, try alternative endpoint
      console.log(
        "[LocalWhisperProvider] Trying alternative endpoint /transcribe"
      );

      try {
        const altEndpoint = `${this.baseUrl}/transcribe`;
        const altResponse = await fetch(altEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!altResponse.ok) {
          throw error; // Re-throw original error
        }

        const altData = await altResponse.json();
        const transcript = altData.text || altData.transcript || "";

        return {
          transcript,
          language: altData.language,
          duration: altData.duration,
        };
      } catch {
        // Re-throw original error with more context
        throw new Error(
          `[LocalWhisperProvider] Failed to connect to local Whisper server at ${this.baseUrl}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }
}
