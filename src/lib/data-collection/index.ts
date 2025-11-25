/**
 * Data Collection Module - Index
 * Tüm veri toplama servislerini export eder
 */

export { HttpClient, httpClient } from "./http-client";
export { ScrapingService, scrapingService } from "./scraping-service";
export { FileParserService, fileParserService } from "./file-parser";
export { ValidationPipeline, validationPipeline } from "./validation-pipeline";
export { ClassificationService, classificationService } from "./classification-service";

// Types re-export
export type {
  // API Types
  HttpMethod,
  AuthType,
  AuthConfig,
  ApiRequestConfig,
  ApiResponse,
  
  // Scraping Types
  ScrapingEngine,
  ScrapingSelector,
  ScrapingConfig,
  ScrapingResult,
  
  // File Types
  FileType,
  ColumnMapping,
  FileUploadConfig,
  FilePreviewResult,
  ColumnInfo,
  
  // Validation Types
  ValidationSeverity,
  ValidationRule,
  ValidationIssue,
  ValidationResult,
  CleaningOptions,
  
  // Classification Types
  ClassificationResult,
  ColumnClassification,
  DetectedPattern,
  SemanticType,
  
  // Pipeline Types
  PipelineStage,
  PipelineState,
  DataCollectionJob,
  
  // Schedule Types
  ScheduleFrequency,
  ScheduleConfig,
} from "@/types/data-collection.types";
