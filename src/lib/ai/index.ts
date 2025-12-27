/**
 * AI Module - Index
 * AI servislerini export eder
 */

export { OpenRouterService, openRouterService } from "./openrouter";
export type { OpenRouterMessage, OpenRouterResponse, OpenRouterConfig } from "./openrouter";

export { CSVNormalizerService, csvNormalizerService } from "./csv-normalizer";
export type {
  NormalizationOptions,
  NormalizationResult,
  NormalizationChange,
} from "./csv-normalizer";

// AI Features - Grafik önerisi, anomali tespiti, NL-to-Chart
export { AIFeaturesService, aiFeaturesService } from "./ai-service";
export type {
  ChartType,
  DataType,
  AnomalySeverity,
  SuggestionStatus,
  DataColumn,
  DataAnalysis,
  ChartRecommendation,
  AnomalyDetection,
  NLQuery,
  AISuggestion,
} from "./ai-service";
