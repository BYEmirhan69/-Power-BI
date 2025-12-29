/**
 * GROQ AI Service
 * Llama modelleri ile CSV dosyalarını normalize etmek için
 * https://console.groq.com
 */

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResponse {
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

export interface GroqConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// GROQ ücretsiz modelleri
export const GROQ_MODELS = {
  LLAMA_3_3_70B: "llama-3.3-70b-versatile",
  LLAMA_3_1_8B: "llama-3.1-8b-instant",
  LLAMA_3_2_3B: "llama-3.2-3b-preview",
  GEMMA_2_9B: "gemma2-9b-it",
  MIXTRAL_8X7B: "mixtral-8x7b-32768",
} as const;

const DEFAULT_MODEL = GROQ_MODELS.LLAMA_3_3_70B;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * GROQ API Client
 */
export class GroqService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || "";
    this.model = model || DEFAULT_MODEL;

    if (!this.apiKey) {
      console.warn(
        "GROQ API Key bulunamadı. GROQ_API_KEY environment variable'ını ayarlayın."
      );
    }
  }

  /**
   * API key'in geçerli olup olmadığını kontrol eder
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith("gsk_");
  }

  /**
   * GROQ API'ye chat completion isteği gönderir
   */
  async chat(
    messages: GroqMessage[],
    config?: GroqConfig
  ): Promise<{ success: boolean; content?: string; error?: string; usage?: GroqResponse["usage"] }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "GROQ API Key yapılandırılmamış",
      };
    }

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config?.model || this.model,
          messages,
          temperature: config?.temperature ?? 0.3,
          max_tokens: config?.max_tokens ?? 8192,
          top_p: config?.top_p ?? 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `GROQ API hatası: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data: GroqResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          error: "GROQ yanıtı boş",
        };
      }

      return {
        success: true,
        content: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      return {
        success: false,
        error: `GROQ isteği başarısız: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Sistem prompt'u ile mesaj gönderir
   */
  async chatWithSystem(
    systemPrompt: string,
    userMessage: string,
    config?: GroqConfig
  ): Promise<{ success: boolean; content?: string; error?: string; usage?: GroqResponse["usage"] }> {
    return this.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      config
    );
  }

  /**
   * Model listesini döner
   */
  getAvailableModels(): typeof GROQ_MODELS {
    return GROQ_MODELS;
  }
}

// Singleton instance
export const groqService = new GroqService();
