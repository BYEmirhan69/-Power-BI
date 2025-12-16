/**
 * CSV Normalizer Service
 * Düzensiz CSV verilerini AI ile temizler ve standart hale getirir
 */

import { OpenRouterService, type OpenRouterConfig } from "./openrouter";
import { type ColumnInfo } from "@/types/data-collection.types";

export interface NormalizationOptions {
  /** Hedef tarih formatı */
  targetDateFormat?: string;
  /** Hedef sayı formatı (locale) */
  numberLocale?: "tr-TR" | "en-US" | "de-DE";
  /** Boş değerlerin nasıl işleneceği */
  nullHandling?: "keep" | "empty" | "null" | "remove";
  /** Kolon adlarını normalize et */
  normalizeColumnNames?: boolean;
  /** Tutarsız değerleri düzelt */
  fixInconsistentValues?: boolean;
  /** Encoding sorunlarını düzelt */
  fixEncodingIssues?: boolean;
  /** Ekstra boşlukları temizle */
  trimWhitespace?: boolean;
  /** Özel temizleme kuralları */
  customRules?: string[];
}

export interface NormalizationResult {
  success: boolean;
  /** Düzenlenmiş veri */
  normalizedData?: Record<string, unknown>[];
  /** Düzenlenmiş kolon bilgileri */
  normalizedColumns?: ColumnInfo[];
  /** Yapılan değişikliklerin özeti */
  changes?: NormalizationChange[];
  /** Hata mesajı */
  error?: string;
  /** AI yanıt süresi (ms) */
  processingTime?: number;
}

export interface NormalizationChange {
  type: "column_rename" | "value_fix" | "format_standardize" | "null_handle" | "encoding_fix" | "duplicate_remove";
  description: string;
  affectedRows?: number;
  before?: string;
  after?: string;
}

const SYSTEM_PROMPT = `Sen bir veri temizleme ve normalizasyon uzmanısın. CSV verilerini analiz edip düzenleme yapıyorsun.

GÖREV:
Sana verilen CSV verilerini analiz et ve düzensizlikleri tespit edip düzelt.

KONTROL EDECEKLERİN:
1. Kolon Adları: Tutarsız, Türkçe karakter sorunlu, boşluklu veya anlamsız kolon adlarını düzelt
2. Tarih Formatları: Farklı tarih formatlarını (DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY vb.) standart formata çevir
3. Sayı Formatları: Virgül/nokta karışıklığını düzelt (1.234,56 vs 1,234.56)
4. Boş Değerler: NULL, N/A, -, boş string gibi değerleri standartlaştır
5. Encoding Sorunları: Türkçe karakter bozuklukları (Ã¼ → ü, Ã§ → ç vb.)
6. Tutarsız Değerler: Aynı anlamdaki farklı yazımları (Evet/evet/E/Yes → Evet)
7. Gereksiz Boşluklar: Başta/sonda fazla boşluklar, çoklu boşluklar
8. Tekrar Eden Satırlar: Duplicate kayıtları tespit et

ÇIKTI FORMATI:
JSON formatında yanıt ver:
{
  "normalizedData": [...düzenlenmiş veri...],
  "changes": [
    {
      "type": "column_rename|value_fix|format_standardize|null_handle|encoding_fix|duplicate_remove",
      "description": "Yapılan değişikliğin açıklaması",
      "affectedRows": 0,
      "before": "eski değer örneği",
      "after": "yeni değer örneği"
    }
  ],
  "normalizedColumns": [
    {
      "name": "kolon_adi",
      "originalName": "eski kolon adı",
      "type": "string|number|date|boolean",
      "nullable": true
    }
  ]
}

ÖNEMLİ:
- Sadece JSON çıktı ver, başka açıklama ekleme
- Veri kaybı yapma, sadece format ve tutarlılık düzelt
- Türkçe karakterleri doğru kullan
- Değişiklik yapılmayacaksa bile JSON formatında yanıt ver`;

/**
 * CSV verilerini AI ile normalize eden servis
 */
export class CSVNormalizerService {
  private openRouter: OpenRouterService;

  constructor(apiKey?: string) {
    this.openRouter = new OpenRouterService(apiKey);
  }

  /**
   * CSV verilerini normalize eder
   */
  async normalize(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    options: NormalizationOptions = {}
  ): Promise<NormalizationResult> {
    const startTime = Date.now();

    try {
      // Veri çok büyükse parçalara böl
      const maxRows = 100; // AI token limiti için
      const dataToProcess = data.slice(0, maxRows);
      const hasMoreData = data.length > maxRows;

      // Kullanıcı mesajını oluştur
      const userMessage = this.buildUserMessage(dataToProcess, columns, options);

      // AI'a gönder
      const config: OpenRouterConfig = {
        temperature: 0.1, // Düşük temperature = daha tutarlı sonuç
        max_tokens: 8192,
      };

      const response = await this.openRouter.chatWithSystem(
        SYSTEM_PROMPT,
        userMessage,
        config
      );

      if (!response.success || !response.content) {
        return {
          success: false,
          error: response.error || "AI yanıtı alınamadı",
          processingTime: Date.now() - startTime,
        };
      }

      // AI yanıtını parse et
      const parsedResult = this.parseAIResponse(response.content);

      if (!parsedResult.success) {
        return {
          success: false,
          error: parsedResult.error,
          processingTime: Date.now() - startTime,
        };
      }

      // Eğer daha fazla veri varsa, normalize edilmiş şablonu uygula
      let finalData = parsedResult.normalizedData || [];
      if (hasMoreData && parsedResult.normalizedData) {
        finalData = this.applyNormalizationToRemainingData(
          data.slice(maxRows),
          parsedResult.changes || [],
          parsedResult.normalizedData
        );
        finalData = [...(parsedResult.normalizedData || []), ...finalData];
      }

      return {
        success: true,
        normalizedData: finalData,
        normalizedColumns: parsedResult.normalizedColumns,
        changes: parsedResult.changes,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Normalizasyon hatası: ${(error as Error).message}`,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Kullanıcı mesajını oluşturur
   */
  private buildUserMessage(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    options: NormalizationOptions
  ): string {
    const parts: string[] = [];

    // Ayarları ekle
    parts.push("## Normalizasyon Ayarları:");
    parts.push(`- Hedef tarih formatı: ${options.targetDateFormat || "YYYY-MM-DD"}`);
    parts.push(`- Sayı locale: ${options.numberLocale || "tr-TR"}`);
    parts.push(`- Boş değer işleme: ${options.nullHandling || "keep"}`);
    parts.push(`- Kolon adlarını normalize et: ${options.normalizeColumnNames ?? true}`);
    parts.push(`- Tutarsız değerleri düzelt: ${options.fixInconsistentValues ?? true}`);
    parts.push(`- Encoding düzelt: ${options.fixEncodingIssues ?? true}`);
    parts.push(`- Boşlukları temizle: ${options.trimWhitespace ?? true}`);

    if (options.customRules && options.customRules.length > 0) {
      parts.push(`\n## Özel Kurallar:`);
      options.customRules.forEach((rule, i) => {
        parts.push(`${i + 1}. ${rule}`);
      });
    }

    // Kolon bilgilerini ekle
    parts.push(`\n## Mevcut Kolonlar:`);
    columns.forEach((col) => {
      parts.push(`- ${col.name}: ${col.inferredType} (nullCount: ${col.nullCount})`);
    });

    // Veriyi ekle
    parts.push(`\n## CSV Verisi (${data.length} satır):`);
    parts.push("```json");
    parts.push(JSON.stringify(data, null, 2));
    parts.push("```");

    return parts.join("\n");
  }

  /**
   * AI yanıtını parse eder
   */
  private parseAIResponse(content: string): Partial<NormalizationResult> {
    try {
      // JSON bloğunu bul
      let jsonContent = content;
      
      // ```json ... ``` bloğunu ara
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      } else {
        // { ile başlayan JSON'u bul
        const startIndex = content.indexOf("{");
        const endIndex = content.lastIndexOf("}");
        if (startIndex !== -1 && endIndex !== -1) {
          jsonContent = content.substring(startIndex, endIndex + 1);
        }
      }

      const parsed = JSON.parse(jsonContent);

      return {
        success: true,
        normalizedData: parsed.normalizedData,
        normalizedColumns: parsed.normalizedColumns,
        changes: parsed.changes,
      };
    } catch (error) {
      return {
        success: false,
        error: `AI yanıtı parse edilemedi: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Normalizasyon kurallarını kalan verilere uygular
   */
  private applyNormalizationToRemainingData(
    remainingData: Record<string, unknown>[],
    changes: NormalizationChange[],
    _sampleData: Record<string, unknown>[]
  ): Record<string, unknown>[] {
    // Kolon yeniden adlandırma mapping'i oluştur
    const columnMapping: Record<string, string> = {};
    changes
      .filter((c) => c.type === "column_rename")
      .forEach((change) => {
        if (change.before && change.after) {
          columnMapping[change.before] = change.after;
        }
      });

    // Her satırı işle
    return remainingData.map((row) => {
      const newRow: Record<string, unknown> = {};

      Object.entries(row).forEach(([key, value]) => {
        const newKey = columnMapping[key] || key;
        let newValue = value;

        // Basit string temizleme
        if (typeof newValue === "string") {
          newValue = newValue.trim().replace(/\s+/g, " ");
        }

        newRow[newKey] = newValue;
      });

      return newRow;
    });
  }

  /**
   * Hızlı analiz - AI kullanmadan temel sorunları tespit eder
   */
  analyzeQuick(
    data: Record<string, unknown>[],
    columns: ColumnInfo[]
  ): { issues: string[]; needsAINormalization: boolean } {
    const issues: string[] = [];

    // Kolon adı sorunları
    columns.forEach((col) => {
      if (/[ğüşöçıİĞÜŞÖÇ]/.test(col.name)) {
        issues.push(`Kolon adında Türkçe karakter: ${col.name}`);
      }
      if (/\s/.test(col.name)) {
        issues.push(`Kolon adında boşluk: "${col.name}"`);
      }
    });

    // Veri tutarsızlıkları
    const sampleData = data.slice(0, 50);
    const valueCounts: Record<string, Set<string>> = {};

    columns.forEach((col) => {
      valueCounts[col.name] = new Set();
    });

    sampleData.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          valueCounts[key]?.add(String(value));
        }
      });
    });

    // Encoding sorunları kontrol
    const turkishBrokenChars = /Ã¼|Ã§|Ã¶|Ã°|ÅŸ|Ä°|Ã‡|Ã–|Ãœ|Ä/;
    let hasEncodingIssues = false;

    sampleData.forEach((row) => {
      Object.values(row).forEach((value) => {
        if (typeof value === "string" && turkishBrokenChars.test(value)) {
          hasEncodingIssues = true;
        }
      });
    });

    if (hasEncodingIssues) {
      issues.push("Encoding sorunu tespit edildi (bozuk Türkçe karakterler)");
    }

    // Farklı tarih formatları
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}\.\d{2}\.\d{4}$/,
    ];
    let _dateFormatCount = 0;

    columns
      .filter((c) => c.inferredType === "date")
      .forEach((col) => {
        const formats = new Set<number>();
        sampleData.forEach((row) => {
          const value = String(row[col.name] || "");
          datePatterns.forEach((pattern, idx) => {
            if (pattern.test(value)) formats.add(idx);
          });
        });
        if (formats.size > 1) {
          _dateFormatCount++;
          issues.push(`Farklı tarih formatları: ${col.name}`);
        }
      });

    return {
      issues,
      needsAINormalization: issues.length > 0,
    };
  }
}

// Singleton instance
export const csvNormalizerService = new CSVNormalizerService();
