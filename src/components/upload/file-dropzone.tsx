"use client";

import { useCallback, useState } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { 
  Upload, 
  FileSpreadsheet, 
  File, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface FileWithPreview extends File {
  preview?: string;
}

interface UploadedFile {
  file: FileWithPreview;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface FileDropzoneProps {
  onFilesAccepted?: (files: File[]) => void;
  onUpload?: (file: File) => Promise<void>;
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number; // bytes
  disabled?: boolean;
  className?: string;
  showFileList?: boolean;
  autoUpload?: boolean;
}

// Varsayılan kabul edilen dosya türleri
const DEFAULT_ACCEPT: Accept = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/json": [".json"],
};

// Dosya boyutunu formatla
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Dosya türüne göre ikon
const getFileIcon = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "csv":
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    case "json":
      return <File className="h-8 w-8 text-yellow-500" />;
    default:
      return <File className="h-8 w-8 text-muted-foreground" />;
  }
};

export function FileDropzone({
  onFilesAccepted,
  onUpload,
  accept = DEFAULT_ACCEPT,
  maxFiles = 5,
  maxSize = 50 * 1024 * 1024, // 50MB
  disabled = false,
  className,
  showFileList = true,
  autoUpload = false,
}: FileDropzoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Dosyaları yükle
  const uploadFile = useCallback(
    async (uploadedFile: UploadedFile) => {
      if (!onUpload) return;

      setFiles((prev) =>
        prev.map((f) =>
          f.file === uploadedFile.file
            ? { ...f, status: "uploading" as const, progress: 0 }
            : f
        )
      );

      try {
        // Simüle progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.file === uploadedFile.file && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        await onUpload(uploadedFile.file);

        clearInterval(progressInterval);

        setFiles((prev) =>
          prev.map((f) =>
            f.file === uploadedFile.file
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        );

        toast.success("Dosya yüklendi", {
          description: uploadedFile.file.name,
        });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === uploadedFile.file
              ? {
                  ...f,
                  status: "error" as const,
                  error: (error as Error).message,
                }
              : f
          )
        );

        toast.error("Yükleme başarısız", {
          description: (error as Error).message,
        });
      }
    },
    [onUpload]
  );

  // Dosya bırakıldığında
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Reddedilen dosyaları bildir
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e) => {
          switch (e.code) {
            case "file-too-large":
              return `Dosya çok büyük (max: ${formatFileSize(maxSize)})`;
            case "file-invalid-type":
              return "Geçersiz dosya türü";
            case "too-many-files":
              return `En fazla ${maxFiles} dosya yükleyebilirsiniz`;
            default:
              return e.message;
          }
        });

        toast.error(rejection.file.name, {
          description: errors.join(", "),
        });
      });

      // Kabul edilen dosyaları ekle
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        file: Object.assign(file, {
          preview: URL.createObjectURL(file),
        }),
        status: "pending" as const,
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Callback çağır
      if (onFilesAccepted) {
        onFilesAccepted(acceptedFiles);
      }

      // Otomatik yükleme
      if (autoUpload && onUpload) {
        newFiles.forEach((f) => uploadFile(f));
      }
    },
    [onFilesAccepted, onUpload, autoUpload, uploadFile, maxFiles, maxSize]
  );

  // Dosyayı kaldır
  const removeFile = (file: FileWithPreview) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
  };

  // Tüm dosyaları yükle
  const uploadAllFiles = () => {
    files
      .filter((f) => f.status === "pending")
      .forEach((f) => uploadFile(f));
  };

  // Dropzone hook
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled,
    multiple: maxFiles > 1,
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone Alanı */}
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragActive && "border-primary bg-primary/10",
          isDragReject && "border-destructive bg-destructive/10",
          disabled && "opacity-50 cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full transition-colors",
              isDragActive ? "bg-primary/20" : "bg-muted",
              isDragReject && "bg-destructive/20"
            )}
          >
            <Upload
              className={cn(
                "h-8 w-8",
                isDragActive ? "text-primary" : "text-muted-foreground",
                isDragReject && "text-destructive"
              )}
            />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive
                ? isDragReject
                  ? "Bu dosya türü desteklenmiyor"
                  : "Dosyaları buraya bırakın"
                : "Dosyaları sürükleyip bırakın"}
            </p>
            <p className="text-sm text-muted-foreground">
              veya dosya seçmek için tıklayın
            </p>
            <p className="text-xs text-muted-foreground">
              CSV, Excel (.xls, .xlsx), JSON • Maksimum {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Dosya Listesi */}
      {showFileList && files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Seçilen Dosyalar ({files.length})
            </h4>
            {!autoUpload && onUpload && files.some((f) => f.status === "pending") && (
              <Button size="sm" onClick={uploadAllFiles}>
                Tümünü Yükle
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((uploadedFile, index) => (
              <div
                key={`${uploadedFile.file.name}-${index}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                  uploadedFile.status === "error" && "border-destructive/50 bg-destructive/5",
                  uploadedFile.status === "success" && "border-green-500/50 bg-green-500/5"
                )}
              >
                {/* Dosya İkonu */}
                {getFileIcon(uploadedFile.file.name)}

                {/* Dosya Bilgileri */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {uploadedFile.status === "uploading" && (
                    <Progress value={uploadedFile.progress} className="h-1 mt-2" />
                  )}

                  {/* Hata Mesajı */}
                  {uploadedFile.status === "error" && uploadedFile.error && (
                    <p className="text-xs text-destructive mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>

                {/* Status İkon */}
                <div className="flex items-center gap-2">
                  {uploadedFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {uploadedFile.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {uploadedFile.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}

                  {/* Kaldır Butonu */}
                  {uploadedFile.status !== "uploading" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFile(uploadedFile.file)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
