/**
 * OpenRouter AI Service
 * Grok 4.1 Fast model entegrasyonu
 * https://openrouter.ai/x-ai/grok-4.1-fast:free
 */

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

const DEFAULT_MODEL = "x-ai/grok-4.1-fast:free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * OpenRouter API Client
 */
export class OpenRouterService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
    this.model = model || DEFAULT_MODEL;

    if (!this.apiKey) {
      console.warn(
        "OpenRouter API Key bulunamadı. OPENROUTER_API_KEY environment variable'ını ayarlayın."
      );
    }
  }

  /**
   * OpenRouter API'ye chat completion isteği gönderir
   */
  async chat(
    messages: OpenRouterMessage[],
    config?: OpenRouterConfig
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "OpenRouter API Key yapılandırılmamış",
      };
    }

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Power BI Platform - CSV Normalizer",
        },
        body: JSON.stringify({
          model: config?.model || this.model,
          messages,
          temperature: config?.temperature ?? 0.3,
          max_tokens: config?.max_tokens ?? 4096,
          top_p: config?.top_p ?? 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenRouter API hatası: ${response.status} - ${errorText}`,
        };
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: "OpenRouter yanıtı boş",
        };
      }

      return {
        success: true,
        content: data.choices[0].message.content,
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenRouter isteği başarısız: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Sistem prompt'u ile mesaj gönderir
   */
  async chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    config?: OpenRouterConfig
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    return this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      config
    );
  }
}

// Singleton instance
export const openRouterService = new OpenRouterService();
