"use client";

/**
 * File Uploader Component
 * CSV/Excel dosyası yükleme, önizleme ve AI ile normalizasyon
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, AlertCircle, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Inline Progress component to avoid module resolution issues
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}
const Progress = ({ className, value = 0, max = 100, ...props }: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
import type { FilePreviewResult, ColumnInfo, AINormalizationChange, AINormalizationOptions } from "@/types/data-collection.types";

interface FileUploaderProps {
  onPreviewComplete?: (result: FilePreviewResult) => void;
  onNormalizationComplete?: (result: NormalizationResultData) => void;
  onError?: (error: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // bytes
  className?: string;
  enableAINormalization?: boolean;
}

interface NormalizationResultData {
  normalizedData: Record<string, unknown>[];
  normalizedColumns?: ColumnInfo[];
  changes: AINormalizationChange[];
  processingTime: number;
}

interface AnalysisResult {
  issues: string[];
  needsAINormalization: boolean;
  issueCount: number;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "analyzing" | "normalizing" | "normalized" | "error";

export function FileUploader({
  onPreviewComplete,
  onNormalizationComplete,
  onError,
  accept = {
    "text/csv": [".csv"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-excel": [".xls"],
    "application/json": [".json"],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
  enableAINormalization = true,
}: FileUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<FilePreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [normalizationResult, setNormalizationResult] = useState<NormalizationResultData | null>(null);

  // AI ile veriyi analiz et
  const analyzeData = async (data: Record<string, unknown>[], columns: ColumnInfo[]) => {
    try {
      const response = await fetch("/api/data-collection/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, columns }),
      });

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult({
          issues: result.issues,
          needsAINormalization: result.needsAINormalization,
          issueCount: result.issueCount,
        });
      }
    } catch (err) {
      console.error("Analiz hatası:", err);
    }
  };

  // AI ile veriyi normalize et
  const normalizeWithAI = async (options?: AINormalizationOptions) => {
    if (!previewResult) return;

    setStatus("normalizing");
    setProgress(0);

    try {
      setProgress(30);

      const response = await fetch("/api/data-collection/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: previewResult.preview,
          columns: previewResult.columns,
          options: options || {
            targetDateFormat: "YYYY-MM-DD",
            numberLocale: "tr-TR",
            normalizeColumnNames: true,
            fixInconsistentValues: true,
            fixEncodingIssues: true,
            trimWhitespace: true,
          },
        }),
      });

      setProgress(70);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Normalizasyon başarısız");
      }

      setProgress(100);
      
      const normResult: NormalizationResultData = {
        normalizedData: result.normalizedData,
        normalizedColumns: result.normalizedColumns,
        changes: result.changes || [],
        processingTime: result.processingTime,
      };

      setNormalizationResult(normResult);
      setStatus("normalized");
      onNormalizationComplete?.(normResult);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setStatus("error");
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const processFile = async (file: File) => {
    setStatus("uploading");
    setProgress(20);
    setError(null);
    setAnalysisResult(null);
    setNormalizationResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("previewRows", "100");

      setProgress(40);
      setStatus("processing");

      const response = await fetch("/api/data-collection/file/preview", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      const result: FilePreviewResult = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Dosya işlenemedi");
      }

      setProgress(100);
      setStatus("success");
      setPreviewResult(result);
      onPreviewComplete?.(result);

      // AI analizi yap (arka planda)
      if (enableAINormalization && result.preview.length > 0) {
        analyzeData(result.preview, result.columns);
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      setStatus("error");
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    if (rejectedFiles.length > 0) {
      setError("Dosya kabul edilmedi. Lütfen desteklenen formatları kontrol edin.");
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const resetUpload = () => {
    setStatus("idle");
    setProgress(0);
    setSelectedFile(null);
    setPreviewResult(null);
    setError(null);
    setAnalysisResult(null);
    setNormalizationResult(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Dosya Yükle
        </CardTitle>
        <CardDescription>
          CSV, Excel (.xlsx, .xls) veya JSON dosyası yükleyin
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "idle" && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Dosyayı buraya bırakın...</p>
            ) : (
              <>
                <p className="text-muted-foreground mb-2">
                  Dosyayı sürükleyip bırakın veya
                </p>
                <Button variant="secondary" size="sm">
                  Dosya Seçin
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Maksimum boyut: {formatFileSize(maxSize)}
                </p>
              </>
            )}
          </div>
        )}

        {(status === "uploading" || status === "processing") && selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {status === "uploading" ? "Yükleniyor..." : "İşleniyor..."}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {status === "success" && selectedFile && previewResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-green-700 dark:text-green-300">
                  Dosya başarıyla işlendi
                </p>
                <p className="text-sm text-muted-foreground">
                  {previewResult.totalRows} satır, {previewResult.columns.length} kolon
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm">
              <p className="font-medium mb-2">Tespit edilen kolonlar:</p>
              <div className="flex flex-wrap gap-2">
                {previewResult.columns.map((col: ColumnInfo) => (
                  <span
                    key={col.name}
                    className="px-2 py-1 bg-muted rounded text-xs"
                    title={`Tip: ${col.inferredType}, Boş: ${col.nullCount}`}
                  >
                    {col.name}
                    <span className="ml-1 text-muted-foreground">({col.inferredType})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* AI Analiz Sonucu */}
            {enableAINormalization && analysisResult && analysisResult.needsAINormalization && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      Veri Kalitesi Sorunları Tespit Edildi
                    </p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {analysisResult.issues.slice(0, 3).map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                      {analysisResult.issues.length > 3 && (
                        <li className="text-amber-600">
                          +{analysisResult.issues.length - 3} diğer sorun
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <Button
                  className="w-full mt-3"
                  onClick={() => normalizeWithAI()}
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI ile Düzenle (Grok 4.1)
                </Button>
              </div>
            )}

            {/* AI Normalizasyon yoksa manuel buton */}
            {enableAINormalization && analysisResult && !analysisResult.needsAINormalization && (
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Veri formatı standart görünüyor
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Normalizing durumu */}
        {status === "normalizing" && selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
              <div className="flex-1">
                <p className="font-medium text-purple-700 dark:text-purple-300">
                  AI ile Düzenleniyor...
                </p>
                <p className="text-sm text-muted-foreground">
                  Grok 4.1 veriyi analiz ediyor ve düzenliyor
                </p>
              </div>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Normalized durumu */}
        {status === "normalized" && normalizationResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="font-medium text-purple-700 dark:text-purple-300">
                  Veri Başarıyla Düzenlendi
                </p>
                <p className="text-sm text-muted-foreground">
                  {normalizationResult.changes.length} değişiklik yapıldı 
                  ({normalizationResult.processingTime}ms)
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Yapılan değişiklikler */}
            {normalizationResult.changes.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-2">Yapılan Değişiklikler:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {normalizationResult.changes.map((change, i) => (
                    <div key={i} className="p-2 bg-muted rounded text-xs">
                      <span className="font-medium capitalize">
                        {change.type.replace(/_/g, " ")}:
                      </span>{" "}
                      {change.description}
                      {change.before && change.after && (
                        <div className="mt-1 text-muted-foreground">
                          <span className="line-through">{change.before}</span>
                          {" → "}
                          <span className="text-green-600 dark:text-green-400">{change.after}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Düzenlenmiş kolon listesi */}
            {normalizationResult.normalizedColumns && (
              <div className="text-sm">
                <p className="font-medium mb-2">Düzenlenmiş Kolonlar:</p>
                <div className="flex flex-wrap gap-2">
                  {normalizationResult.normalizedColumns.map((col: ColumnInfo) => (
                    <span
                      key={col.name}
                      className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs"
                    >
                      {col.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-700 dark:text-red-300">
                  Hata oluştu
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={resetUpload}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={resetUpload} className="w-full">
              Tekrar Dene
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
