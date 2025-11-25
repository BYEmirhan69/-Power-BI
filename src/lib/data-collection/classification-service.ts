/**
 * Data Classification Service
 * Otomatik veri sınıflandırma - Rule-based + Heuristic
 */

import { DataCategory } from "@/types/database.types";
import {
  ClassificationResult,
  ColumnClassification,
  DetectedPattern,
  SemanticType,
  ColumnInfo,
} from "@/types/data-collection.types";

// Kolon ismi pattern'leri
const COLUMN_PATTERNS: Record<SemanticType, RegExp[]> = {
  // Zaman ile ilgili
  date: [/^date$/i, /^tarih$/i, /created/i, /updated/i, /_at$/i, /_date$/i],
  datetime: [/datetime/i, /timestamp/i, /zaman/i],
  time: [/^time$/i, /^saat$/i, /hour/i, /minute/i],
  year: [/^year$/i, /^yil$/i, /^yıl$/i],
  month: [/^month$/i, /^ay$/i],
  quarter: [/^quarter$/i, /^ceyrek$/i, /^çeyrek$/i],
  
  // Finansal
  currency: [/price/i, /fiyat/i, /amount/i, /tutar/i, /total/i, /toplam/i],
  percentage: [/percent/i, /oran/i, /rate$/i],
  revenue: [/revenue/i, /gelir/i, /income/i, /sales/i, /satis/i, /satış/i],
  cost: [/cost/i, /maliyet/i, /expense/i, /gider/i],
  price: [/price/i, /fiyat/i, /ucret/i, /ücret/i],
  
  // Sayısal metrikler
  count: [/count/i, /sayı/i, /sayi/i, /adet/i, /num_/i, /_num$/i],
  quantity: [/quantity/i, /qty/i, /miktar/i, /amount/i],
  rating: [/rating/i, /puan/i, /score$/i, /derece/i],
  score: [/score/i, /skor/i, /point/i],
  
  // Kullanıcı/Davranış
  user_id: [/user_?id/i, /kullanici_?id/i, /member_?id/i, /customer_?id/i],
  session_id: [/session/i, /oturum/i],
  email: [/email/i, /e-?posta/i, /mail/i],
  phone: [/phone/i, /tel/i, /mobile/i, /cep/i],
  
  // Konum
  country: [/country/i, /ulke/i, /ülke/i, /nation/i],
  city: [/city/i, /sehir/i, /şehir/i, /il$/i],
  
  // Web/Teknoloji
  url: [/url/i, /link/i, /href/i, /website/i],
  ip_address: [/ip_?address/i, /ip$/i, /client_ip/i],
  device: [/device/i, /cihaz/i, /platform/i],
  browser: [/browser/i, /tarayici/i, /tarayıcı/i],
  os: [/^os$/i, /operating/i, /isletim/i, /işletim/i],
  app_version: [/version/i, /versiyon/i, /surum/i, /sürüm/i],
  
  // Kategori/Durum
  category: [/category/i, /kategori/i, /type$/i, /tip$/i, /tür$/i, /tur$/i],
  status: [/status/i, /durum/i, /state$/i],
  boolean: [/^is_/i, /^has_/i, /^can_/i, /active/i, /enabled/i, /flag$/i],
  
  // Metin
  text: [/description/i, /aciklama/i, /açıklama/i, /comment/i, /yorum/i, /note/i, /not$/i],
  unknown: [],
};

// Veri kategorisi için ağırlıklar
const CATEGORY_WEIGHTS: Record<DataCategory, Record<SemanticType, number>> = {
  time_series: {
    date: 10, datetime: 10, time: 8, year: 6, month: 6, quarter: 6,
    currency: 3, percentage: 2, revenue: 4, cost: 4, price: 3,
    count: 4, quantity: 3, rating: 2, score: 2,
    user_id: 0, session_id: 0, email: 0, phone: 0,
    country: 1, city: 1, url: 0, ip_address: 0,
    device: 0, browser: 0, os: 0, app_version: 0,
    category: 1, status: 1, boolean: 0, text: 0, unknown: 0,
  },
  behavioral: {
    date: 3, datetime: 4, time: 3, year: 1, month: 2, quarter: 1,
    currency: 2, percentage: 3, revenue: 2, cost: 1, price: 2,
    count: 5, quantity: 4, rating: 6, score: 5,
    user_id: 10, session_id: 8, email: 6, phone: 4,
    country: 4, city: 4, url: 5, ip_address: 4,
    device: 5, browser: 5, os: 4, app_version: 3,
    category: 4, status: 4, boolean: 3, text: 2, unknown: 0,
  },
  technological: {
    date: 2, datetime: 3, time: 2, year: 1, month: 1, quarter: 1,
    currency: 1, percentage: 3, revenue: 1, cost: 2, price: 1,
    count: 5, quantity: 3, rating: 4, score: 4,
    user_id: 4, session_id: 6, email: 2, phone: 1,
    country: 2, city: 2, url: 6, ip_address: 7,
    device: 10, browser: 10, os: 10, app_version: 9,
    category: 4, status: 5, boolean: 4, text: 2, unknown: 0,
  },
  financial: {
    date: 6, datetime: 5, time: 2, year: 4, month: 5, quarter: 6,
    currency: 10, percentage: 8, revenue: 10, cost: 10, price: 9,
    count: 4, quantity: 5, rating: 1, score: 1,
    user_id: 2, session_id: 1, email: 2, phone: 2,
    country: 3, city: 2, url: 1, ip_address: 1,
    device: 1, browser: 1, os: 1, app_version: 1,
    category: 4, status: 4, boolean: 2, text: 2, unknown: 0,
  },
  other: {
    date: 1, datetime: 1, time: 1, year: 1, month: 1, quarter: 1,
    currency: 1, percentage: 1, revenue: 1, cost: 1, price: 1,
    count: 1, quantity: 1, rating: 1, score: 1,
    user_id: 1, session_id: 1, email: 1, phone: 1,
    country: 1, city: 1, url: 1, ip_address: 1,
    device: 1, browser: 1, os: 1, app_version: 1,
    category: 1, status: 1, boolean: 1, text: 1, unknown: 1,
  },
};

// Kategori için önerilen grafik tipleri
const CATEGORY_CHART_SUGGESTIONS: Record<DataCategory, string[]> = {
  time_series: ["line", "area", "bar", "combo"],
  behavioral: ["bar", "pie", "scatter", "heatmap"],
  technological: ["pie", "bar", "radar", "scatter"],
  financial: ["line", "bar", "area", "combo"],
  other: ["bar", "pie", "line"],
};

export class ClassificationService {
  /**
   * Veri setini sınıflandırır
   */
  classify(
    columns: ColumnInfo[],
    sampleData?: Record<string, unknown>[]
  ): ClassificationResult {
    // 1. Her kolon için semantik tip belirle
    const columnClassifications = columns.map((col) =>
      this.classifyColumn(col, sampleData)
    );

    // 2. Kategori skorlarını hesapla
    const categoryScores = this.calculateCategoryScores(columnClassifications);

    // 3. En yüksek skorlu kategoriyi seç
    const sortedCategories = Object.entries(categoryScores).sort(
      (a, b) => b[1] - a[1]
    );
    const topCategory = sortedCategories[0][0] as DataCategory;
    const topScore = sortedCategories[0][1];
    const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

    // 4. Confidence hesapla
    const confidence = totalScore > 0 ? topScore / totalScore : 0;

    // 5. Pattern'leri tespit et
    const patterns = this.detectPatterns(columnClassifications);

    // 6. Reasoning oluştur
    const reasoning = this.generateReasoning(
      columnClassifications,
      topCategory,
      confidence
    );

    return {
      category: topCategory,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
      suggestedChartTypes: CATEGORY_CHART_SUGGESTIONS[topCategory],
      detectedPatterns: patterns,
    };
  }

  /**
   * Tek bir kolonu sınıflandırır
   */
  classifyColumn(
    column: ColumnInfo,
    sampleData?: Record<string, unknown>[]
  ): ColumnClassification {
    const patterns: string[] = [];
    let bestType: SemanticType = "unknown";
    let bestConfidence = 0;

    // 1. İsim bazlı eşleştirme
    for (const [type, regexes] of Object.entries(COLUMN_PATTERNS)) {
      for (const regex of regexes) {
        if (regex.test(column.name)) {
          patterns.push(`İsim eşleşti: ${regex.source}`);
          const typeConfidence = 0.7;
          if (typeConfidence > bestConfidence) {
            bestType = type as SemanticType;
            bestConfidence = typeConfidence;
          }
        }
      }
    }

    // 2. Veri tipi bazlı çıkarım
    const typeInference = this.inferFromDataType(column, sampleData);
    if (typeInference.confidence > bestConfidence) {
      bestType = typeInference.type;
      bestConfidence = typeInference.confidence;
      patterns.push(...typeInference.patterns);
    }

    // 3. Değer pattern'i kontrolü
    if (sampleData && sampleData.length > 0) {
      const valueInference = this.inferFromValues(column.name, sampleData);
      if (valueInference.confidence > bestConfidence * 0.8) {
        // Değer bazlı çıkarım biraz daha düşük ağırlıklı
        if (valueInference.confidence > bestConfidence) {
          bestType = valueInference.type;
          bestConfidence = valueInference.confidence;
        }
        patterns.push(...valueInference.patterns);
      }
    }

    return {
      column: column.name,
      semanticType: bestType,
      confidence: bestConfidence,
      patterns,
    };
  }

  /**
   * Veri tipinden çıkarım yapar
   */
  private inferFromDataType(
    column: ColumnInfo,
    sampleData?: Record<string, unknown>[]
  ): { type: SemanticType; confidence: number; patterns: string[] } {
    const patterns: string[] = [];
    let type: SemanticType = "unknown";
    let confidence = 0;

    switch (column.inferredType) {
      case "date":
        type = "date";
        confidence = 0.8;
        patterns.push("Veri tipi: tarih");
        break;

      case "number":
        // Sayısal değerleri analiz et
        if (sampleData && sampleData.length > 0) {
          const values = sampleData
            .map((row) => row[column.name])
            .filter((v): v is number => typeof v === "number");

          if (values.length > 0) {
            const allIntegers = values.every((v) => Number.isInteger(v));
            const allPositive = values.every((v) => v >= 0);
            const max = Math.max(...values);
            const min = Math.min(...values);

            if (allIntegers && allPositive && max <= 5 && min >= 1) {
              type = "rating";
              confidence = 0.6;
              patterns.push("1-5 arası tam sayılar (rating olabilir)");
            } else if (allIntegers && allPositive) {
              type = "count";
              confidence = 0.5;
              patterns.push("Pozitif tam sayılar (sayım olabilir)");
            } else if (max <= 100 && min >= 0) {
              type = "percentage";
              confidence = 0.4;
              patterns.push("0-100 arası değerler (yüzde olabilir)");
            } else {
              type = "quantity";
              confidence = 0.3;
              patterns.push("Sayısal değer");
            }
          }
        }
        break;

      case "boolean":
        type = "boolean";
        confidence = 0.9;
        patterns.push("Veri tipi: boolean");
        break;

      case "string":
        // String değerleri kontrol et
        type = "text";
        confidence = 0.3;
        patterns.push("Veri tipi: metin");
        break;
    }

    return { type, confidence, patterns };
  }

  /**
   * Değerlerden çıkarım yapar
   */
  private inferFromValues(
    columnName: string,
    sampleData: Record<string, unknown>[]
  ): { type: SemanticType; confidence: number; patterns: string[] } {
    const patterns: string[] = [];
    let type: SemanticType = "unknown";
    let confidence = 0;

    const values = sampleData
      .map((row) => row[columnName])
      .filter((v) => v !== null && v !== undefined)
      .map(String);

    if (values.length === 0) {
      return { type, confidence, patterns };
    }

    // Email kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (values.filter((v) => emailRegex.test(v)).length > values.length * 0.8) {
      type = "email";
      confidence = 0.9;
      patterns.push("Email formatı tespit edildi");
    }

    // URL kontrolü
    const urlRegex = /^https?:\/\//;
    if (values.filter((v) => urlRegex.test(v)).length > values.length * 0.8) {
      type = "url";
      confidence = 0.9;
      patterns.push("URL formatı tespit edildi");
    }

    // IP adresi kontrolü
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (values.filter((v) => ipRegex.test(v)).length > values.length * 0.8) {
      type = "ip_address";
      confidence = 0.9;
      patterns.push("IP adresi formatı tespit edildi");
    }

    // Telefon kontrolü
    const phoneRegex = /^[\d\s\-+()]{10,}$/;
    if (values.filter((v) => phoneRegex.test(v)).length > values.length * 0.7) {
      type = "phone";
      confidence = 0.7;
      patterns.push("Telefon formatı tespit edildi");
    }

    // Browser/Device kontrolü
    const browserKeywords = ["chrome", "firefox", "safari", "edge", "opera", "ie"];
    const deviceKeywords = ["mobile", "desktop", "tablet", "ios", "android", "windows", "macos"];
    const osKeywords = ["windows", "macos", "linux", "ios", "android"];

    const lowerValues = values.map((v) => v.toLowerCase());
    
    if (lowerValues.some((v) => browserKeywords.some((b) => v.includes(b)))) {
      type = "browser";
      confidence = 0.7;
      patterns.push("Browser bilgisi tespit edildi");
    }

    if (lowerValues.some((v) => deviceKeywords.some((d) => v.includes(d)))) {
      if (type === "unknown") {
        type = "device";
        confidence = 0.7;
        patterns.push("Cihaz bilgisi tespit edildi");
      }
    }

    if (lowerValues.some((v) => osKeywords.some((o) => v.includes(o)))) {
      if (type === "unknown") {
        type = "os";
        confidence = 0.6;
        patterns.push("İşletim sistemi bilgisi tespit edildi");
      }
    }

    // Benzersizlik kontrolü (ID olabilir)
    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio > 0.95 && values[0].length > 5) {
      if (type === "unknown") {
        type = "user_id";
        confidence = 0.5;
        patterns.push("Yüksek benzersizlik oranı (ID olabilir)");
      }
    }

    // Kategori kontrolü (düşük benzersizlik)
    if (uniqueRatio < 0.1 && values.length > 10) {
      if (type === "unknown") {
        type = "category";
        confidence = 0.6;
        patterns.push("Düşük benzersizlik (kategori olabilir)");
      }
    }

    return { type, confidence, patterns };
  }

  /**
   * Kategori skorlarını hesaplar
   */
  private calculateCategoryScores(
    classifications: ColumnClassification[]
  ): Record<DataCategory, number> {
    const scores: Record<DataCategory, number> = {
      time_series: 0,
      behavioral: 0,
      technological: 0,
      financial: 0,
      other: 0,
    };

    for (const classification of classifications) {
      const { semanticType, confidence } = classification;
      
      for (const category of Object.keys(scores) as DataCategory[]) {
        const weight = CATEGORY_WEIGHTS[category][semanticType] || 0;
        scores[category] += weight * confidence;
      }
    }

    return scores;
  }

  /**
   * Pattern'leri tespit eder
   */
  private detectPatterns(
    classifications: ColumnClassification[]
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Temporal pattern
    const temporalColumns = classifications
      .filter((c) =>
        ["date", "datetime", "time", "year", "month", "quarter"].includes(c.semanticType)
      )
      .map((c) => c.column);

    if (temporalColumns.length > 0) {
      patterns.push({
        type: "temporal",
        columns: temporalColumns,
        description: `${temporalColumns.length} zaman kolonu tespit edildi`,
      });
    }

    // Categorical pattern
    const categoricalColumns = classifications
      .filter((c) => ["category", "status", "boolean"].includes(c.semanticType))
      .map((c) => c.column);

    if (categoricalColumns.length > 0) {
      patterns.push({
        type: "categorical",
        columns: categoricalColumns,
        description: `${categoricalColumns.length} kategorik kolon tespit edildi`,
      });
    }

    // Numerical pattern
    const numericalColumns = classifications
      .filter((c) =>
        ["count", "quantity", "price", "revenue", "cost", "rating", "score", "percentage", "currency"].includes(c.semanticType)
      )
      .map((c) => c.column);

    if (numericalColumns.length > 0) {
      patterns.push({
        type: "numerical",
        columns: numericalColumns,
        description: `${numericalColumns.length} sayısal metrik kolonu tespit edildi`,
      });
    }

    // Identifier pattern
    const identifierColumns = classifications
      .filter((c) =>
        ["user_id", "session_id", "email", "phone"].includes(c.semanticType)
      )
      .map((c) => c.column);

    if (identifierColumns.length > 0) {
      patterns.push({
        type: "identifier",
        columns: identifierColumns,
        description: `${identifierColumns.length} tanımlayıcı kolon tespit edildi`,
      });
    }

    return patterns;
  }

  /**
   * Sınıflandırma gerekçesini oluşturur
   */
  private generateReasoning(
    classifications: ColumnClassification[],
    category: DataCategory,
    confidence: number
  ): string[] {
    const reasons: string[] = [];

    // Ana kategori
    const categoryNames: Record<DataCategory, string> = {
      time_series: "Zaman Serisi",
      behavioral: "Davranışsal",
      technological: "Teknolojik",
      financial: "Finansal",
      other: "Genel",
    };

    reasons.push(
      `Veri seti "${categoryNames[category]}" kategorisi olarak sınıflandırıldı (güven: %${Math.round(confidence * 100)})`
    );

    // Önemli kolonları listele
    const importantColumns = classifications
      .filter((c) => c.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    if (importantColumns.length > 0) {
      reasons.push("Tespit edilen önemli kolonlar:");
      for (const col of importantColumns) {
        reasons.push(`  - ${col.column}: ${col.semanticType} (%${Math.round(col.confidence * 100)})`);
      }
    }

    // Öneriler
    const suggestions = CATEGORY_CHART_SUGGESTIONS[category];
    reasons.push(`Önerilen grafik türleri: ${suggestions.join(", ")}`);

    return reasons;
  }

  /**
   * Hızlı sınıflandırma - sadece kategori döndürür
   */
  quickClassify(columns: ColumnInfo[]): DataCategory {
    const result = this.classify(columns);
    return result.category;
  }
}

// Singleton instance
export const classificationService = new ClassificationService();
