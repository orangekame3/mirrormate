import dns from "dns";
import { VLMProvider, WavingResult, OllamaVLMConfig } from "./types";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

interface OllamaVLMResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

const WAVING_PROMPT = `Analyze this webcam image. Is the person waving or raising their hand to greet?

A "wave" includes:
- Hand raised with palm facing camera
- Hand moving side to side
- Any greeting gesture with raised hand
- Peace sign or similar hand gesture

Answer in JSON format:
{"waving": true, "confidence": 0.8, "reason": "hand is raised"}

If you see a raised hand or waving motion, set waving to true.
JSON:`;

export class OllamaVLMProvider implements VLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: OllamaVLMConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llava:7b";
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
          images: [base64Data],
        },
      ],
      stream: false,
      options: {
        temperature: 0.1, // Low temperature for consistent JSON output
      },
    };

    console.log(`[VLM] Sending image to ${this.model}...`);

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VLM] API error ${response.status}:`, errorText);
      throw new Error(`Ollama VLM API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaVLMResponse;
    const content = data.message?.content || "";
    console.log(`[VLM] Response: ${content.substring(0, 100)}...`);

    return content;
  }

  async checkWaving(imageBase64: string): Promise<WavingResult> {
    try {
      const response = await this.analyzeImage(imageBase64, WAVING_PROMPT);

      console.log("[VLM] Raw response:", response);

      // Try to parse JSON from response - look for the last complete JSON object
      const jsonMatches = response.match(/\{[^{}]*\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try each match, starting from the last one
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(jsonMatches[i]);
            // Check for waving or looking key (llava might use either)
            const isWaving = Boolean(parsed.waving ?? parsed.looking ?? parsed.wave);
            return {
              waving: isWaving,
              confidence: Number(parsed.confidence) || (isWaving ? 0.8 : 0.2),
              reason: String(parsed.reason || parsed.description || ""),
              rawResponse: response,
            };
          } catch {
            continue;
          }
        }
      }

      // Fallback: Check for yes/no or waving keywords in text response
      const lowerResponse = response.toLowerCase();
      const positiveKeywords = ["yes", "waving", "raised hand", "greeting", "wave", "raising"];
      const negativeKeywords = ["no", "not waving", "no wave", "not raising"];

      const hasPositive = positiveKeywords.some(kw => lowerResponse.includes(kw));
      const hasNegative = negativeKeywords.some(kw => lowerResponse.includes(kw));

      if (hasPositive && !hasNegative) {
        return {
          waving: true,
          confidence: 0.6,
          reason: "Detected from text response",
          rawResponse: response,
        };
      }

      console.warn("[VLM] Could not parse response:", response);
      return {
        waving: false,
        confidence: 0,
        reason: "Could not parse response",
        rawResponse: response
      };
    } catch (error) {
      console.error("[VLM] checkWaving error:", error);
      return {
        waving: false,
        confidence: 0,
        reason: "Error: " + (error instanceof Error ? error.message : "Unknown"),
      };
    }
  }
}
