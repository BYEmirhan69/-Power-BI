import { z } from "zod";
import { DataCategory, DataSourceType } from "./database.types";

// ============================================
// API Entegrasyonu Tipleri
// ============================================

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const AuthTypeSchema = z.enum(["none", "bearer", "api_key", "basic", "oauth2"]);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const ApiKeyLocationSchema = z.enum(["header", "query"]);
export type ApiKeyLocation = z.infer<typeof ApiKeyLocationSchema>;

// API Kimlik Doğrulama Şemaları
export const AuthConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("none"),
  }),
  z.object({
    type: z.literal("bearer"),
    token: z.string().min(1, "Token gerekli"),
  }),
  z.object({
    type: z.literal("api_key"),
    key: z.string().min(1, "API Key gerekli"),
    value: z.string().min(1, "API Key değeri gerekli"),
    location: ApiKeyLocationSchema,
  }),
  z.object({
    type: z.literal("basic"),
    username: z.string().min(1, "Kullanıcı adı gerekli"),
    password: z.string().min(1, "Şifre gerekli"),
  }),
  z.object({
    type: z.literal("oauth2"),
    clientId: z.string().min(1, "Client ID gerekli"),
    clientSecret: z.string().min(1, "Client Secret gerekli"),
    tokenUrl: z.string().url("Geçerli bir URL gerekli"),
    scopes: z.array(z.string()).optional(),
  }),
]);
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

// API İstek Yapılandırması
export const ApiRequestConfigSchema = z.object({
  url: z.string().url("Geçerli bir URL gerekli"),
  method: HttpMethodSchema.default("GET"),
  headers: z.record(z.string(), z.string()).optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  auth: AuthConfigSchema,
  timeout: z.number().min(1000).max(60000).default(30000),
  retryCount: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(100).max(10000).default(1000),
});
export type ApiRequestConfig = z.infer<typeof ApiRequestConfigSchema>;

// API Yanıt Tipi
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
  duration?: number;
}

// ============================================
// Web Scraping Tipleri
// ============================================

export const ScrapingEngineSchema = z.enum(["cheerio", "puppeteer"]);
export type ScrapingEngine = z.infer<typeof ScrapingEngineSchema>;

export const SelectorTypeSchema = z.enum(["css", "xpath"]);
export type SelectorType = z.infer<typeof SelectorTypeSchema>;

// Scraping Seçici Tanımı
export const ScrapingSelectorSchema = z.object({
  name: z.string().min(1, "Alan adı gerekli"),
  selector: z.string().min(1, "Seçici gerekli"),
  selectorType: SelectorTypeSchema.default("css"),
  attribute: z.string().optional(), // href, src, data-* vb.
  multiple: z.boolean().default(false),
  transform: z.enum(["text", "html", "number", "date", "trim", "lowercase", "uppercase"]).optional(),
});
export type ScrapingSelector = z.infer<typeof ScrapingSelectorSchema>;

// Scraping Yapılandırması
export const ScrapingConfigSchema = z.object({
  url: z.string().url("Geçerli bir URL gerekli"),
  engine: ScrapingEngineSchema.default("cheerio"),
  selectors: z.array(ScrapingSelectorSchema).min(1, "En az bir seçici gerekli"),
  pagination: z.object({
    enabled: z.boolean().default(false),
    nextSelector: z.string().optional(),
    maxPages: z.number().min(1).max(100).default(10),
    delay: z.number().min(500).max(10000).default(1000),
  }).optional(),
  waitForSelector: z.string().optional(), // Puppeteer için
  userAgent: z.string().optional(),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
  })).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().min(5000).max(120000).default(30000),
  javascript: z.boolean().default(false), // true ise Puppeteer kullan
});
export type ScrapingConfig = z.infer<typeof ScrapingConfigSchema>;

// Scraping Sonucu
export interface ScrapingResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  pagesScraped?: number;
  totalRecords?: number;
  duration?: number;
}

// ============================================
// Dosya Yükleme Tipleri
// ============================================

export const FileTypeSchema = z.enum(["csv", "xlsx", "xls", "json"]);
export type FileType = z.infer<typeof FileTypeSchema>;

// Kolon Eşleme
export const ColumnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetColumn: z.string(),
  dataType: z.enum(["string", "number", "date", "boolean", "json"]),
  dateFormat: z.string().optional(), // date tipi için
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
});
export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

// Dosya Yükleme Yapılandırması
export const FileUploadConfigSchema = z.object({
  fileType: FileTypeSchema,
  encoding: z.string().default("utf-8"),
  delimiter: z.string().default(","), // CSV için
  hasHeader: z.boolean().default(true),
  sheetName: z.string().optional(), // Excel için
  skipRows: z.number().min(0).default(0),
  maxRows: z.number().min(1).optional(),
  columnMappings: z.array(ColumnMappingSchema).optional(),
  dateFormats: z.array(z.string()).default([
    "YYYY-MM-DD",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD HH:mm:ss",
    "DD.MM.YYYY",
  ]),
});
export type FileUploadConfig = z.infer<typeof FileUploadConfigSchema>;

// Dosya Önizleme Sonucu
export interface FilePreviewResult {
  success: boolean;
  columns: ColumnInfo[];
  preview: Record<string, unknown>[];
  totalRows: number;
  error?: string;
}

export interface ColumnInfo {
  name: string;
  inferredType: "string" | "number" | "date" | "boolean" | "json" | "mixed";
  sampleValues: unknown[];
  nullCount: number;
  uniqueCount: number;
}

// ============================================
// Veri Doğrulama Tipleri
// ============================================

export const ValidationSeveritySchema = z.enum(["error", "warning", "info"]);
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;

export const ValidationRuleTypeSchema = z.enum([
  "required",
  "type",
  "range",
  "format",
  "unique",
  "custom",
]);
export type ValidationRuleType = z.infer<typeof ValidationRuleTypeSchema>;

// Doğrulama Kuralı
export const ValidationRuleSchema = z.object({
  column: z.string(),
  type: ValidationRuleTypeSchema,
  params: z.record(z.string(), z.any()).optional(),
  message: z.string().optional(),
  severity: ValidationSeveritySchema.default("error"),
  autoFix: z.boolean().default(false),
});
export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

// Doğrulama Hatası
export interface ValidationIssue {
  row?: number;
  column?: string;
  value?: unknown;
  rule: ValidationRuleType;
  severity: ValidationSeverity;
  message: string;
  suggestedFix?: unknown;
  fixed?: boolean;
}

// Doğrulama Sonucu
export interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    autoFixed: number;
  };
  cleanedData?: Record<string, unknown>[];
}

// ============================================
// Veri Temizleme Seçenekleri
// ============================================

export const CleaningOptionsSchema = z.object({
  // Boş değer işleme
  handleNulls: z.enum(["keep", "remove_row", "fill_default", "fill_previous", "fill_mean"]).default("keep"),
  defaultValues: z.record(z.string(), z.any()).optional(),
  
  // String temizleme
  trimStrings: z.boolean().default(true),
  removeExtraSpaces: z.boolean().default(true),
  normalizeEncoding: z.boolean().default(true),
  
  // Sayısal temizleme
  removeOutliers: z.boolean().default(false),
  outlierMethod: z.enum(["iqr", "zscore", "percentile"]).default("iqr"),
  outlierThreshold: z.number().default(1.5),
  
  // Tarih temizleme
  standardizeDates: z.boolean().default(true),
  targetDateFormat: z.string().default("YYYY-MM-DD"),
  
  // Duplicate işleme
  removeDuplicates: z.boolean().default(false),
  duplicateColumns: z.array(z.string()).optional(), // Boş ise tüm kolonlar
  keepDuplicate: z.enum(["first", "last"]).default("first"),
  
  // Tip dönüşümü
  enforceTypes: z.boolean().default(true),
  typeCoercion: z.record(z.string(), z.enum(["string", "number", "date", "boolean"])).optional(),
});
export type CleaningOptions = z.infer<typeof CleaningOptionsSchema>;

// ============================================
// Otomatik Sınıflandırma Tipleri
// ============================================

export interface ClassificationResult {
  category: DataCategory;
  confidence: number; // 0-1 arası
  reasoning: string[];
  suggestedChartTypes: string[];
  detectedPatterns: DetectedPattern[];
}

export interface DetectedPattern {
  type: "temporal" | "categorical" | "numerical" | "identifier" | "text";
  columns: string[];
  description: string;
}

export interface ColumnClassification {
  column: string;
  semanticType: SemanticType;
  confidence: number;
  patterns: string[];
}

export type SemanticType =
  | "date"
  | "datetime"
  | "time"
  | "year"
  | "month"
  | "quarter"
  | "currency"
  | "percentage"
  | "count"
  | "quantity"
  | "price"
  | "revenue"
  | "cost"
  | "user_id"
  | "session_id"
  | "email"
  | "phone"
  | "url"
  | "ip_address"
  | "country"
  | "city"
  | "category"
  | "status"
  | "boolean"
  | "rating"
  | "score"
  | "device"
  | "browser"
  | "os"
  | "app_version"
  | "text"
  | "unknown";

// ============================================
// Pipeline Tipleri
// ============================================

export type PipelineStage =
  | "upload"
  | "preview"
  | "mapping"
  | "validation"
  | "cleaning"
  | "classification"
  | "import"
  | "complete";

export interface PipelineState {
  currentStage: PipelineStage;
  progress: number; // 0-100
  stages: {
    [key in PipelineStage]?: {
      status: "pending" | "running" | "completed" | "failed";
      startedAt?: string;
      completedAt?: string;
      error?: string;
      result?: unknown;
    };
  };
}

export interface DataCollectionJob {
  id: string;
  type: DataSourceType;
  config: ApiRequestConfig | ScrapingConfig | FileUploadConfig;
  pipeline: PipelineState;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  organizationId: string;
}

// ============================================
// Scheduler Tipleri (İleride kullanılacak)
// ============================================

export const ScheduleFrequencySchema = z.enum([
  "once",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "custom",
]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencySchema>;

export const ScheduleConfigSchema = z.object({
  frequency: ScheduleFrequencySchema,
  time: z.string().optional(), // HH:mm format
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 = Pazar
  dayOfMonth: z.number().min(1).max(31).optional(),
  cronExpression: z.string().optional(), // custom için
  timezone: z.string().default("Europe/Istanbul"),
  enabled: z.boolean().default(true),
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
});
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
