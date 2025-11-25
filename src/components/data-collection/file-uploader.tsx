"use client";

/**
 * File Uploader Component
 * CSV/Excel dosyası yükleme ve önizleme
 */

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
import type { FilePreviewResult, ColumnInfo } from "@/types/data-collection.types";

interface FileUploaderProps {
  onPreviewComplete?: (result: FilePreviewResult) => void;
  onError?: (error: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // bytes
  className?: string;
}

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

export function FileUploader({
  onPreviewComplete,
  onError,
  accept = {
    "text/csv": [".csv"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "application/vnd.ms-excel": [".xls"],
    "application/json": [".json"],
  },
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
}: FileUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<FilePreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setStatus("uploading");
    setProgress(20);
    setError(null);

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
