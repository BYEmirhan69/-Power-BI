"use client";

/**
 * Data Import Page
 * Veri toplama ve içe aktarma sayfası
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileUploader,
  ApiConnector,
  DataPreview,
  ValidationResults,
} from "@/components/data-collection";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Globe,
  ArrowRight,
  CheckCircle,
  Loader2,
  Database,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type {
  FilePreviewResult,
  ValidationResult,
  ClassificationResult,
  ColumnInfo,
  CleaningOptions,
  AINormalizationChange,
} from "@/types/data-collection.types";

type ImportStep = "source" | "preview" | "validate" | "import" | "complete";

export default function DataImportPage() {
  const router = useRouter();
  
  // State
  const [currentStep, setCurrentStep] = useState<ImportStep>("source");
  const [sourceType, setSourceType] = useState<"file" | "api">("file");
  
  // Data states
  const [previewResult, setPreviewResult] = useState<FilePreviewResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  
  // Import form
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // Loading states
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizationChanges, setNormalizationChanges] = useState<AINormalizationChange[]>([]);

  // Cleaning options
  const [cleaningOptions] = useState<Partial<CleaningOptions>>({
    trimStrings: true,
    removeExtraSpaces: true,
    standardizeDates: true,
    handleNulls: "keep",
    removeDuplicates: false,
  });

  const handlePreviewComplete = (result: FilePreviewResult) => {
    setPreviewResult(result);
    setCurrentStep("preview");
    
    // Auto-suggest dataset name from file
    if (!datasetName) {
      setDatasetName(result.columns[0]?.name || "Yeni Dataset");
    }
  };

  const handleApiConnect = (config: unknown, data: unknown) => {
    // API'den gelen veriyi preview formatına çevir
    const dataArray = Array.isArray(data) ? data : [data];
    
    if (dataArray.length === 0) {
      toast.error("API'den veri alınamadı");
      return;
    }

    const columns: ColumnInfo[] = Object.keys(dataArray[0] as Record<string, unknown>).map((key) => ({
      name: key,
      inferredType: typeof (dataArray[0] as Record<string, unknown>)[key] === "number" 
        ? "number" 
        : "string",
      sampleValues: dataArray.slice(0, 5).map((row) => (row as Record<string, unknown>)[key]),
      nullCount: dataArray.filter((row) => (row as Record<string, unknown>)[key] == null).length,
      uniqueCount: new Set(dataArray.map((row) => String((row as Record<string, unknown>)[key]))).size,
    }));

    setPreviewResult({
      success: true,
      columns,
      preview: dataArray as Record<string, unknown>[],
      totalRows: dataArray.length,
    });
    setCurrentStep("preview");
  };

  const handleValidate = async () => {
    if (!previewResult) return;

    setIsValidating(true);
    try {
      const response = await fetch("/api/data-collection/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: previewResult.preview,
          columns: previewResult.columns,
          cleaningOptions,
          autoClassify: true,
        }),
      });

      const result = await response.json();
      
      if (result.validation) {
        setValidationResult(result.validation);
        setClassification(result.classification);
        
        if (result.classification?.category) {
          setSelectedCategory(result.classification.category);
        }
        
        setCurrentStep("validate");
        toast.success("Doğrulama tamamlandı");
      } else {
        toast.error("Doğrulama hatası");
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsValidating(false);
    }
  };

  // AI ile veriyi normalize et
  const handleNormalizeWithAI = async () => {
    if (!previewResult) return;

    setIsNormalizing(true);
    try {
      const response = await fetch("/api/data-collection/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: previewResult.preview,
          columns: previewResult.columns,
          options: {
            targetDateFormat: "YYYY-MM-DD",
            numberLocale: "tr-TR",
            normalizeColumnNames: true,
            fixInconsistentValues: true,
            fixEncodingIssues: true,
            trimWhitespace: true,
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "AI düzenleme başarısız");
      }

      // Normalize edilmiş veriyi güncelle
      setPreviewResult({
        ...previewResult,
        preview: result.normalizedData,
        columns: result.normalizedColumns || previewResult.columns,
      });

      setNormalizationChanges(result.changes || []);

      toast.success("✨ Veri AI ile Düzenlendi!", {
        description: `${result.changes?.length || 0} değişiklik yapıldı (${result.processingTime}ms)`,
        duration: 5000,
      });
    } catch (error) {
      toast.error("AI Düzenleme Başarısız", {
        description: (error as Error).message,
      });
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleImport = async () => {
    if (!validationResult?.cleanedData || !datasetName) return;

    setIsImporting(true);
    try {
      const response = await fetch("/api/data-collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: datasetName,
          description: datasetDescription,
          data: validationResult.cleanedData,
          columns: previewResult?.columns,
          category: selectedCategory,
          dataSourceType: sourceType === "file" ? "csv" : "api",
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentStep("complete");
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const goToStep = (step: ImportStep) => {
    setCurrentStep(step);
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Veri İçe Aktar</h1>
        <p className="text-muted-foreground mt-1">
          Dosya yükleyin veya API&apos;den veri çekin
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { key: "source", label: "Kaynak", icon: Database },
            { key: "preview", label: "Önizleme", icon: FileSpreadsheet },
            { key: "validate", label: "Doğrulama", icon: CheckCircle },
            { key: "import", label: "İçe Aktar", icon: ArrowRight },
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted =
              ["source", "preview", "validate", "import", "complete"].indexOf(currentStep) >
              ["source", "preview", "validate", "import", "complete"].indexOf(step.key as ImportStep);

            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => {
                    if (isCompleted || isActive) goToStep(step.key as ImportStep);
                  }}
                  disabled={!isCompleted && !isActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary cursor-pointer"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < 3 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === "source" && (
        <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "file" | "api")}>
          <TabsList className="mb-4">
            <TabsTrigger value="file" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Dosya Yükle
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2">
              <Globe className="h-4 w-4" />
              API Bağlantısı
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <FileUploader
              onPreviewComplete={handlePreviewComplete}
              onError={(error) => toast.error(error)}
            />
          </TabsContent>

          <TabsContent value="api">
            <ApiConnector
              onConnect={handleApiConnect}
              onError={(error: string) => toast.error(error)}
            />
          </TabsContent>
        </Tabs>
      )}

      {currentStep === "preview" && previewResult && (
        <div className="space-y-6">
          <DataPreview
            data={previewResult.preview}
            columns={previewResult.columns}
            pageSize={50}
            pageSizeOptions={[25, 50, 100, 250, 500]}
            maxHeight="calc(100vh - 450px)"
          />

          {/* AI ile Düzenle Bölümü */}
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100">
                      AI ile Veri Düzenleme
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Karışık tarih formatları, tutarsız değerler ve encoding sorunlarını düzelt
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleNormalizeWithAI}
                  disabled={isNormalizing}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isNormalizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Düzenleniyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI ile Düzenle
                    </>
                  )}
                </Button>
              </div>

              {/* Yapılan değişiklikler */}
              {normalizationChanges.length > 0 && (
                <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
                    ✨ Yapılan Değişiklikler ({normalizationChanges.length})
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {normalizationChanges.map((change, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-medium capitalize text-purple-700 dark:text-purple-300">
                          {change.type.replace(/_/g, " ")}:
                        </span>
                        <span>{change.description}</span>
                        {change.before && change.after && (
                          <span className="ml-auto">
                            <span className="line-through text-red-500">{change.before}</span>
                            {" → "}
                            <span className="text-green-600">{change.after}</span>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{previewResult.totalRows || previewResult.preview.length}</span> satır ve{" "}
              <span className="font-medium text-foreground">{previewResult.columns.length}</span> kolon bulundu
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => goToStep("source")}>
                Geri
              </Button>
              <Button onClick={handleValidate} disabled={isValidating || isNormalizing} size="lg">
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Doğrulanıyor...
                  </>
                ) : (
                  <>
                    Doğrula ve Devam Et
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {currentStep === "validate" && validationResult && previewResult && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <ValidationResults result={validationResult} />
            
            <Card>
              <CardHeader>
                <CardTitle>İçe Aktarma Ayarları</CardTitle>
                <CardDescription>
                  Dataset bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dataset Adı *</Label>
                  <Input
                    id="name"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Örn: Satış Verileri 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Input
                    id="description"
                    value={datasetDescription}
                    onChange={(e) => setDatasetDescription(e.target.value)}
                    placeholder="Opsiyonel açıklama..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_series">Zaman Serisi</SelectItem>
                      <SelectItem value="behavioral">Davranışsal</SelectItem>
                      <SelectItem value="technological">Teknolojik</SelectItem>
                      <SelectItem value="financial">Finansal</SelectItem>
                      <SelectItem value="other">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                  {classification && (
                    <p className="text-xs text-muted-foreground">
                      Önerilen: {classification.category} (%{Math.round(classification.confidence * 100)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DataPreview
            data={validationResult.cleanedData || []}
            columns={previewResult.columns}
            classification={classification}
            pageSize={50}
            pageSizeOptions={[25, 50, 100, 250, 500]}
            maxHeight="calc(100vh - 550px)"
          />

          {/* Hata/Uyarı varsa AI ile düzeltme önerisi */}
          {(validationResult.summary.errors > 0 || validationResult.summary.warnings > 0) && (
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                      <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">
                        Sorunları AI ile Düzelt
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        {validationResult.summary.errors} hata ve {validationResult.summary.warnings} uyarı tespit edildi
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      goToStep("preview");
                      setTimeout(() => handleNormalizeWithAI(), 100);
                    }}
                    disabled={isNormalizing}
                    variant="outline"
                    className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Önizlemeye Dön ve Düzelt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => goToStep("preview")}>
              Geri
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !datasetName || !validationResult.isValid}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  İçe Aktarılıyor...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  İçe Aktar ({validationResult.validRows} satır)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {currentStep === "complete" && (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">İçe Aktarma Tamamlandı!</h2>
            <p className="text-muted-foreground mb-6">
              Verileriniz başarıyla kaydedildi. Artık grafik oluşturabilirsiniz.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => router.push("/dashboard/datasets")}>
                Dataset&apos;lere Git
              </Button>
              <Button onClick={() => {
                setCurrentStep("source");
                setPreviewResult(null);
                setValidationResult(null);
                setClassification(null);
                setDatasetName("");
                setDatasetDescription("");
                setSelectedCategory("");
              }}>
                Yeni İçe Aktarma
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
