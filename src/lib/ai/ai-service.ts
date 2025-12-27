/**
 * AI Features Service
 * AI destekli özellikler: Grafik önerisi, anomali tespiti, NL-to-Chart
 * Model bağımsız mimari, OpenRouter entegrasyonu
 */

import { createClient } from "@/lib/supabase/client";
import { OpenRouterService } from "./openrouter";
import type { Json } from "@/types/database.types";

// =============================================
// Types
// =============================================

export type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "heatmap" | "radar";
export type DataType = "time_series" | "categorical" | "numerical" | "mixed";
export type AnomalySeverity = "low" | "medium" | "high" | "critical";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "applied";

export interface DataColumn {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sampleValues: unknown[];
  uniqueCount: number;
  nullCount: number;
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
}

export interface DataAnalysis {
  rowCount: number;
  columns: DataColumn[];
  detectedDataType: DataType;
  hasTimeColumn: boolean;
  categoricalColumns: string[];
  numericalColumns: string[];
  potentialGroupings: string[];
}

export interface ChartRecommendation {
  chartType: ChartType;
  confidence: number;
  reasoning: string;
  suggestedConfig: {
    xAxis?: string;
    yAxis?: string | string[];
    groupBy?: string;
    aggregation?: "sum" | "avg" | "count" | "min" | "max";
    title?: string;
    colorScheme?: string;
  };
  alternativeCharts: Array<{
    chartType: ChartType;
    confidence: number;
  }>;
}

export interface AnomalyDetection {
  id: string;
  datasetId: string;
  chartId: string | null;
  detectedAt: string;
  metric: string;
  value: number;
  expectedRange: { min: number; max: number };
  deviation: number;
  severity: AnomalySeverity;
  description: string;
  possibleCauses: string[];
  suggestedActions: string[];
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  falsePositive: boolean;
}

export interface NLQuery {
  id: string;
  organizationId: string;
  userId: string;
  query: string;
  parsedIntent: {
    chartType: ChartType | null;
    metrics: string[];
    dimensions: string[];
    filters: Array<{ field: string; operator: string; value: unknown }>;
    timeRange: { start?: string; end?: string } | null;
    aggregation: string | null;
  };
  generatedChartConfig: Record<string, unknown> | null;
  confidence: number;
  wasSuccessful: boolean;
  processingTimeMs: number;
  feedbackRating: number | null;
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  organizationId: string;
  userId: string | null;
  suggestionType: "chart_optimization" | "data_insight" | "performance" | "anomaly";
  targetType: "chart" | "dashboard" | "dataset";
  targetId: string;
  title: string;
  description: string;
  suggestedAction: Record<string, unknown> | null;
  expectedImpact: string | null;
  confidence: number;
  status: SuggestionStatus;
  appliedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

// =============================================
// Prompt Templates
// =============================================

const PROMPTS = {
  chartRecommendation: `Sen bir veri görselleştirme uzmanısın. Verilen veri yapısını analiz et ve en uygun grafik türünü öner.

Desteklenen grafik türleri:
- line: Zaman serisi verileri için, trend analizi
- bar: Kategorik karşılaştırmalar için
- pie: Oransal dağılımlar için (max 7-8 kategori)
- area: Zaman içinde değişim + hacim gösterimi
- scatter: İki sayısal değişken korelasyonu için
- heatmap: Matris formatında yoğunluk gösterimi
- radar: Çok boyutlu karşılaştırma için

JSON formatında yanıt ver:
{
  "chartType": "grafik_türü",
  "confidence": 0.0-1.0,
  "reasoning": "Seçim nedeni",
  "xAxis": "x ekseni sütunu",
  "yAxis": ["y ekseni sütunları"],
  "groupBy": "gruplama sütunu veya null",
  "aggregation": "sum|avg|count|min|max veya null",
  "title": "Önerilen başlık",
  "alternatives": [{"chartType": "...", "confidence": 0.0-1.0}]
}`,

  anomalyAnalysis: `Sen bir veri analisti uzmanısın. Verilen metrik değerlerini analiz et ve anomalileri tespit et.
İstatistiksel yöntemler kullan: Z-score (|z| > 2.5 anomali), IQR (1.5*IQR dışı outlier), trend sapması.

JSON formatında yanıt ver:
{
  "anomalies": [
    {
      "index": sayısal_indeks,
      "value": anomali_değeri,
      "expectedMin": beklenen_min,
      "expectedMax": beklenen_max,
      "deviation": sapma_yüzdesi,
      "severity": "low|medium|high|critical",
      "description": "Anomali açıklaması",
      "possibleCauses": ["olası_neden_1", "olası_neden_2"],
      "suggestedActions": ["önerilen_aksiyon_1"]
    }
  ],
  "summary": "Genel değerlendirme"
}`,

  nlToChart: `Sen doğal dil sorularını grafik konfigürasyonuna çeviren bir asistansın.

Kullanıcının sorusunu analiz et ve aşağıdaki JSON formatında yanıt ver:
{
  "chartType": "line|bar|pie|area|scatter|heatmap|radar",
  "metrics": ["ölçülecek_değerler"],
  "dimensions": ["gruplandırma_boyutları"],
  "filters": [{"field": "alan", "operator": "eq|ne|gt|lt|gte|lte|contains", "value": "değer"}],
  "timeRange": {"start": "ISO_tarih_veya_null", "end": "ISO_tarih_veya_null"},
  "aggregation": "sum|avg|count|min|max|null",
  "confidence": 0.0-1.0,
  "chartConfig": {
    "title": "Grafik başlığı",
    "xAxis": "x ekseni",
    "yAxis": "y ekseni veya dizi",
    "groupBy": "gruplama alanı veya null"
  }
}`,

  dataInsight: `Sen bir business intelligence uzmanısın. Verilen veri setini analiz et ve önemli içgörüler üret.

JSON formatında yanıt ver:
{
  "insights": [
    {
      "type": "trend|comparison|distribution|correlation|anomaly",
      "title": "İçgörü başlığı",
      "description": "Detaylı açıklama",
      "impact": "high|medium|low",
      "suggestedAction": "Önerilen aksiyon"
    }
  ],
  "summary": "Genel özet"
}`,
};

// =============================================
// AI Service Class
// =============================================

export class AIFeaturesService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();
  private openRouter: OpenRouterService;

  constructor(openRouterApiKey?: string) {
    this.openRouter = new OpenRouterService(openRouterApiKey);
  }

  // =============================================
  // Data Analysis
  // =============================================

  /**
   * Veri yapısını analiz et
   */
  analyzeDataStructure(data: Record<string, unknown>[]): DataAnalysis {
    if (!data || data.length === 0) {
      return {
        rowCount: 0,
        columns: [],
        detectedDataType: "mixed",
        hasTimeColumn: false,
        categoricalColumns: [],
        numericalColumns: [],
        potentialGroupings: [],
      };
    }

    const columns: DataColumn[] = [];
    const columnNames = Object.keys(data[0]);
    let hasTimeColumn = false;
    const categoricalColumns: string[] = [];
    const numericalColumns: string[] = [];

    for (const colName of columnNames) {
      const values = data.map((row) => row[colName]);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined);
      const uniqueValues = [...new Set(nonNullValues.map(String))];

      // Tip tespiti
      let type: DataColumn["type"] = "string";
      const sampleValue = nonNullValues[0];

      if (typeof sampleValue === "number") {
        type = "number";
        numericalColumns.push(colName);
      } else if (typeof sampleValue === "boolean") {
        type = "boolean";
      } else if (this.isDateString(String(sampleValue))) {
        type = "date";
        hasTimeColumn = true;
      } else {
        type = "string";
        if (uniqueValues.length < Math.min(20, data.length * 0.3)) {
          categoricalColumns.push(colName);
        }
      }

      const numericValues = type === "number" ? (nonNullValues as number[]) : [];
      const column: DataColumn = {
        name: colName,
        type,
        sampleValues: nonNullValues.slice(0, 5),
        uniqueCount: uniqueValues.length,
        nullCount: values.length - nonNullValues.length,
      };

      if (type === "number" && numericValues.length > 0) {
        column.min = Math.min(...numericValues);
        column.max = Math.max(...numericValues);
        column.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        column.stdDev = this.calculateStdDev(numericValues, column.mean);
      }

      columns.push(column);
    }

    // Veri tipi tespiti
    let detectedDataType: DataType = "mixed";
    if (hasTimeColumn && numericalColumns.length > 0) {
      detectedDataType = "time_series";
    } else if (categoricalColumns.length > 0 && numericalColumns.length > 0) {
      detectedDataType = "categorical";
    } else if (numericalColumns.length >= 2 && categoricalColumns.length === 0) {
      detectedDataType = "numerical";
    }

    return {
      rowCount: data.length,
      columns,
      detectedDataType,
      hasTimeColumn,
      categoricalColumns,
      numericalColumns,
      potentialGroupings: categoricalColumns.filter((c) =>
        columns.find((col) => col.name === c && col.uniqueCount <= 10)
      ),
    };
  }

  // =============================================
  // Chart Recommendation
  // =============================================

  /**
   * AI destekli grafik önerisi
   */
  async recommendChart(
    data: Record<string, unknown>[],
    context?: { purpose?: string; preferences?: string[] }
  ): Promise<ChartRecommendation> {
    const analysis = this.analyzeDataStructure(data);

    // Basit kurallar önce (fallback için)
    const ruleBasedRecommendation = this.getRuleBasedRecommendation(analysis);

    // AI ile zenginleştir
    try {
      const dataDescription = this.buildDataDescription(analysis, context);
      const result = await this.openRouter.chatWithSystem(
        PROMPTS.chartRecommendation,
        dataDescription,
        { temperature: 0.3, max_tokens: 1024 }
      );

      if (result.success && result.content) {
        const aiRecommendation = this.parseChartRecommendation(result.content);
        if (aiRecommendation) {
          // AI önerisini kaydet
          await this.cacheChartRecommendation(analysis, aiRecommendation);
          return aiRecommendation;
        }
      }
    } catch (error) {
      console.error("AI grafik önerisi hatası:", error);
    }

    return ruleBasedRecommendation;
  }

  /**
   * Kural tabanlı grafik önerisi (fallback)
   */
  private getRuleBasedRecommendation(analysis: DataAnalysis): ChartRecommendation {
    let chartType: ChartType = "bar";
    let confidence = 0.6;
    let reasoning = "";

    if (analysis.detectedDataType === "time_series") {
      chartType = "line";
      confidence = 0.85;
      reasoning = "Zaman serisi verisi tespit edildi, trend analizi için çizgi grafik önerilir.";
    } else if (analysis.categoricalColumns.length > 0) {
      const catCol = analysis.columns.find((c) => c.name === analysis.categoricalColumns[0]);
      if (catCol && catCol.uniqueCount <= 7) {
        chartType = "pie";
        confidence = 0.75;
        reasoning = "Az sayıda kategori tespit edildi, oransal dağılım için pasta grafik önerilir.";
      } else {
        chartType = "bar";
        confidence = 0.8;
        reasoning = "Kategorik karşılaştırma için çubuk grafik önerilir.";
      }
    } else if (analysis.numericalColumns.length >= 2) {
      chartType = "scatter";
      confidence = 0.7;
      reasoning = "İki sayısal değişken korelasyonu için dağılım grafiği önerilir.";
    }

    return {
      chartType,
      confidence,
      reasoning,
      suggestedConfig: {
        xAxis: analysis.hasTimeColumn
          ? analysis.columns.find((c) => c.type === "date")?.name
          : analysis.categoricalColumns[0],
        yAxis: analysis.numericalColumns.slice(0, 2),
        groupBy: analysis.potentialGroupings[0],
        aggregation: "sum",
      },
      alternativeCharts: this.getAlternativeCharts(chartType, analysis),
    };
  }

  // =============================================
  // Anomaly Detection
  // =============================================

  /**
   * İstatistiksel anomali tespiti
   */
  detectAnomalies(
    values: number[],
    options: { method?: "zscore" | "iqr" | "both"; threshold?: number } = {}
  ): Array<{ index: number; value: number; zScore?: number; isOutlier: boolean }> {
    const { method = "both", threshold = 2.5 } = options;
    const results: Array<{ index: number; value: number; zScore?: number; isOutlier: boolean }> = [];

    if (values.length < 3) return results;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStdDev(values, mean);

    // IQR hesaplama
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;

      let isOutlier = false;
      if (method === "zscore" || method === "both") {
        isOutlier = isOutlier || zScore > threshold;
      }
      if (method === "iqr" || method === "both") {
        isOutlier = isOutlier || value < lowerBound || value > upperBound;
      }

      if (isOutlier) {
        results.push({ index: i, value, zScore, isOutlier: true });
      }
    }

    return results;
  }

  /**
   * AI destekli anomali analizi
   */
  async analyzeAnomaliesWithAI(
    datasetId: string,
    metric: string,
    values: number[],
    _timestamps?: string[] // Reserved for future time-based analysis
  ): Promise<AnomalyDetection[]> {
    const statisticalAnomalies = this.detectAnomalies(values);

    if (statisticalAnomalies.length === 0) {
      return [];
    }

    // AI ile zenginleştir
    const anomalies: AnomalyDetection[] = [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStdDev(values, mean);

    for (const anomaly of statisticalAnomalies) {
      const deviation = stdDev > 0 ? ((anomaly.value - mean) / mean) * 100 : 0;
      const severity = this.calculateSeverity(anomaly.zScore || 0);

      anomalies.push({
        id: crypto.randomUUID(),
        datasetId,
        chartId: null,
        detectedAt: new Date().toISOString(),
        metric,
        value: anomaly.value,
        expectedRange: {
          min: mean - 2 * stdDev,
          max: mean + 2 * stdDev,
        },
        deviation: Math.round(deviation * 100) / 100,
        severity,
        description: `${metric} değeri beklenenden %${Math.abs(deviation).toFixed(1)} ${deviation > 0 ? "yüksek" : "düşük"}`,
        possibleCauses: this.getPossibleCauses(severity, deviation),
        suggestedActions: this.getSuggestedActions(severity),
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        falsePositive: false,
      });
    }

    // Veritabanına kaydet
    await this.saveAnomalies(anomalies);

    return anomalies;
  }

  // =============================================
  // Natural Language to Chart
  // =============================================

  /**
   * Doğal dil sorgusunu grafik konfigürasyonuna çevir
   */
  async nlToChart(
    organizationId: string,
    userId: string,
    query: string,
    availableColumns: string[]
  ): Promise<NLQuery> {
    const startTime = Date.now();

    const contextPrompt = `Mevcut sütunlar: ${availableColumns.join(", ")}

Kullanıcı sorusu: "${query}"`;

    let parsedIntent: NLQuery["parsedIntent"] = {
      chartType: null,
      metrics: [],
      dimensions: [],
      filters: [],
      timeRange: null,
      aggregation: null,
    };
    let generatedChartConfig: Record<string, unknown> | null = null;
    let confidence = 0;
    let wasSuccessful = false;

    try {
      const result = await this.openRouter.chatWithSystem(PROMPTS.nlToChart, contextPrompt, {
        temperature: 0.2,
        max_tokens: 1024,
      });

      if (result.success && result.content) {
        const parsed = this.parseNLResponse(result.content);
        if (parsed) {
          parsedIntent = {
            chartType: (parsed.chartType as ChartType) || null,
            metrics: (parsed.metrics as string[]) || [],
            dimensions: (parsed.dimensions as string[]) || [],
            filters: (parsed.filters as Array<{ field: string; operator: string; value: unknown }>) || [],
            timeRange: parsed.timeRange as { start?: string; end?: string } | null,
            aggregation: (parsed.aggregation as string) || null,
          };
          generatedChartConfig = parsed.chartConfig as Record<string, unknown>;
          confidence = (parsed.confidence as number) || 0.5;
          wasSuccessful = true;
        }
      }
    } catch (error) {
      console.error("NL-to-Chart hatası:", error);
    }

    const processingTimeMs = Date.now() - startTime;

    // Veritabanına kaydet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (this.supabase as any)
      .from("nl_queries")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        query,
        parsed_intent: parsedIntent as unknown as Json,
        generated_chart_config: generatedChartConfig as unknown as Json,
        confidence,
        was_successful: wasSuccessful,
        processing_time_ms: processingTimeMs,
      })
      .select()
      .single();

    return {
      id: data?.id || crypto.randomUUID(),
      organizationId,
      userId,
      query,
      parsedIntent,
      generatedChartConfig,
      confidence,
      wasSuccessful,
      processingTimeMs,
      feedbackRating: null,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * NL sorgu geri bildirimi
   */
  async rateNLQuery(queryId: string, rating: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from("nl_queries")
      .update({ feedback_rating: Math.min(5, Math.max(1, rating)) })
      .eq("id", queryId);
  }

  // =============================================
  // AI Suggestions
  // =============================================

  /**
   * Grafik optimizasyon önerileri
   */
  async generateSuggestions(
    organizationId: string,
    targetType: "chart" | "dashboard" | "dataset",
    targetId: string,
    context: Record<string, unknown>
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = [];

    // Basit öneriler (rule-based)
    if (targetType === "chart" && context.dataPoints) {
      const dataPoints = context.dataPoints as number;

      if (dataPoints > 1000) {
        suggestions.push({
          id: crypto.randomUUID(),
          organizationId,
          userId: null,
          suggestionType: "performance",
          targetType,
          targetId,
          title: "Veri Toplama Önerisi",
          description: `Grafik ${dataPoints} veri noktası içeriyor. Performansı artırmak için veri toplama önerilir.`,
          suggestedAction: { aggregation: "auto", maxPoints: 500 },
          expectedImpact: "Yükleme süresi %60 azalabilir",
          confidence: 0.85,
          status: "pending",
          appliedAt: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // AI önerileri kaydet
    if (suggestions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.supabase as any).from("ai_suggestions").insert(
        suggestions.map((s) => ({
          organization_id: s.organizationId,
          user_id: s.userId,
          suggestion_type: s.suggestionType,
          target_type: s.targetType,
          target_id: s.targetId,
          title: s.title,
          description: s.description,
          suggested_action: s.suggestedAction as unknown as Json,
          expected_impact: s.expectedImpact,
          confidence: s.confidence,
          status: s.status,
          expires_at: s.expiresAt,
        }))
      );
    }

    return suggestions;
  }

  /**
   * Öneri durumunu güncelle
   */
  async updateSuggestionStatus(suggestionId: string, status: SuggestionStatus): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (status === "applied") {
      updates.applied_at = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).from("ai_suggestions").update(updates).eq("id", suggestionId);
  }

  // =============================================
  // Helper Methods
  // =============================================

  private isDateString(value: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // ISO date
      /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
    ];
    return datePatterns.some((p) => p.test(value)) && !isNaN(Date.parse(value));
  }

  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private buildDataDescription(analysis: DataAnalysis, context?: { purpose?: string }): string {
    return `Veri analizi:
- Satır sayısı: ${analysis.rowCount}
- Sütunlar: ${analysis.columns.map((c) => `${c.name} (${c.type})`).join(", ")}
- Tespit edilen veri tipi: ${analysis.detectedDataType}
- Zaman sütunu var mı: ${analysis.hasTimeColumn ? "Evet" : "Hayır"}
- Kategorik sütunlar: ${analysis.categoricalColumns.join(", ") || "Yok"}
- Sayısal sütunlar: ${analysis.numericalColumns.join(", ") || "Yok"}
${context?.purpose ? `\nAmaç: ${context.purpose}` : ""}`;
  }

  private parseChartRecommendation(content: string): ChartRecommendation | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        chartType: parsed.chartType,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || "",
        suggestedConfig: {
          xAxis: parsed.xAxis,
          yAxis: parsed.yAxis,
          groupBy: parsed.groupBy,
          aggregation: parsed.aggregation,
          title: parsed.title,
        },
        alternativeCharts: parsed.alternatives || [],
      };
    } catch {
      return null;
    }
  }

  private parseNLResponse(content: string): Record<string, unknown> | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  private getAlternativeCharts(
    primary: ChartType,
    analysis: DataAnalysis
  ): Array<{ chartType: ChartType; confidence: number }> {
    const alternatives: Array<{ chartType: ChartType; confidence: number }> = [];

    if (primary === "line" && analysis.numericalColumns.length >= 2) {
      alternatives.push({ chartType: "area", confidence: 0.7 });
    }
    if (primary === "bar") {
      alternatives.push({ chartType: "pie", confidence: 0.5 });
    }
    if (primary === "pie") {
      alternatives.push({ chartType: "bar", confidence: 0.6 });
    }

    return alternatives.slice(0, 2);
  }

  private calculateSeverity(zScore: number): AnomalySeverity {
    if (zScore > 4) return "critical";
    if (zScore > 3.5) return "high";
    if (zScore > 3) return "medium";
    return "low";
  }

  private getPossibleCauses(severity: AnomalySeverity, deviation: number): string[] {
    const causes: string[] = [];
    if (Math.abs(deviation) > 50) {
      causes.push("Veri girişi hatası olabilir");
      causes.push("Sistemsel bir değişiklik olmuş olabilir");
    }
    if (severity === "critical") {
      causes.push("Acil inceleme gerektiren kritik bir değişim");
    }
    causes.push("Mevsimsel dalgalanma");
    return causes;
  }

  private getSuggestedActions(severity: AnomalySeverity): string[] {
    const actions = ["Veriyi doğrulayın"];
    if (severity === "high" || severity === "critical") {
      actions.push("İlgili ekiple iletişime geçin");
      actions.push("Geçmiş dönem verileriyle karşılaştırın");
    }
    return actions;
  }

  private async cacheChartRecommendation(
    analysis: DataAnalysis,
    recommendation: ChartRecommendation
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(analysis);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).from("chart_recommendations_cache").upsert({
      cache_key: cacheKey,
      data_signature: JSON.stringify({
        columns: analysis.columns.map((c) => ({ name: c.name, type: c.type })),
        dataType: analysis.detectedDataType,
      }),
      recommendation: recommendation as unknown as Json,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  private generateCacheKey(analysis: DataAnalysis): string {
    const signature = analysis.columns
      .map((c) => `${c.name}:${c.type}`)
      .sort()
      .join("|");
    return `chart_rec_${Buffer.from(signature).toString("base64").slice(0, 32)}`;
  }

  private async saveAnomalies(anomalies: AnomalyDetection[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).from("anomaly_detections").insert(
      anomalies.map((a) => ({
        id: a.id,
        dataset_id: a.datasetId,
        chart_id: a.chartId,
        detected_at: a.detectedAt,
        metric: a.metric,
        value: a.value,
        expected_range: a.expectedRange as unknown as Json,
        deviation: a.deviation,
        severity: a.severity,
        description: a.description,
        possible_causes: a.possibleCauses,
        suggested_actions: a.suggestedActions,
      }))
    );
  }
}

// =============================================
// Exports
// =============================================

export const aiFeaturesService = new AIFeaturesService();
