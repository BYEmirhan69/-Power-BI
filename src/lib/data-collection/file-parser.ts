/**
 * File Parser Service
 * CSV ve Excel dosyalarını parse eder
 * Client-side preview + Server-side full processing
 */

import {
  FileUploadConfig,
  FilePreviewResult,
  ColumnInfo,
  FileType,
} from "@/types/data-collection.types";

export class FileParserService {
  /**
   * Dosyadan önizleme verisi çıkarır (client-side için)
   * İlk N satırı okur ve kolon bilgilerini çıkarır
   */
  async preview(
    file: File,
    options: Partial<FileUploadConfig> = {},
    previewRows: number = 100
  ): Promise<FilePreviewResult> {
    try {
      const fileType = this.detectFileType(file.name);
      const config: FileUploadConfig = {
        fileType,
        encoding: options.encoding || "utf-8",
        delimiter: options.delimiter || ",",
        hasHeader: options.hasHeader ?? true,
        skipRows: options.skipRows || 0,
        maxRows: previewRows,
        dateFormats: options.dateFormats || [
          "YYYY-MM-DD",
          "DD/MM/YYYY",
          "MM/DD/YYYY",
          "YYYY-MM-DD HH:mm:ss",
          "DD.MM.YYYY",
        ],
      };

      if (fileType === "csv") {
        return await this.parseCSVPreview(file, config);
      } else if (fileType === "xlsx" || fileType === "xls") {
        return await this.parseExcelPreview(file, config);
      } else if (fileType === "json") {
        return await this.parseJSONPreview(file, config);
      }

      return {
        success: false,
        columns: [],
        preview: [],
        totalRows: 0,
        error: `Desteklenmeyen dosya tipi: ${fileType}`,
      };
    } catch (error) {
      return {
        success: false,
        columns: [],
        preview: [],
        totalRows: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Dosya tipini uzantıdan algılar
   */
  detectFileType(filename: string): FileType {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "csv":
        return "csv";
      case "xlsx":
        return "xlsx";
      case "xls":
        return "xls";
      case "json":
        return "json";
      default:
        return "csv"; // Varsayılan
    }
  }

  /**
   * CSV dosyasını önizleme için parse eder
   */
  private async parseCSVPreview(
    file: File,
    config: FileUploadConfig
  ): Promise<FilePreviewResult> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    
    // Skip rows
    const dataLines = lines.slice(config.skipRows);
    
    if (dataLines.length === 0) {
      return {
        success: false,
        columns: [],
        preview: [],
        totalRows: 0,
        error: "Dosya boş veya geçersiz",
      };
    }

    // Header ve data ayır
    const delimiter = this.detectDelimiter(dataLines[0], config.delimiter);
    const headers = config.hasHeader
      ? this.parseCSVLine(dataLines[0], delimiter)
      : this.generateHeaders(this.parseCSVLine(dataLines[0], delimiter).length);
    
    const dataStartIndex = config.hasHeader ? 1 : 0;
    const previewLines = dataLines.slice(
      dataStartIndex,
      dataStartIndex + (config.maxRows || 100)
    );

    // Veriyi parse et
    const preview: Record<string, unknown>[] = previewLines.map((line) => {
      const values = this.parseCSVLine(line, delimiter);
      const record: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? null;
      });
      return record;
    });

    // Kolon bilgilerini çıkar
    const columns = this.analyzeColumns(headers, preview, config.dateFormats);

    return {
      success: true,
      columns,
      preview,
      totalRows: dataLines.length - (config.hasHeader ? 1 : 0),
    };
  }

  /**
   * CSV satırını parse eder (quote handling ile)
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Delimiter'ı otomatik algılar
   */
  private detectDelimiter(line: string, defaultDelimiter: string): string {
    const delimiters = [",", ";", "\t", "|"];
    let maxCount = 0;
    let detected = defaultDelimiter;

    for (const delim of delimiters) {
      const count = (line.match(new RegExp(`\\${delim}`, "g")) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detected = delim;
      }
    }

    return detected;
  }

  /**
   * Excel dosyasını önizleme için parse eder
   */
  private async parseExcelPreview(
    file: File,
    config: FileUploadConfig
  ): Promise<FilePreviewResult> {
    // XLSX kütüphanesi dinamik import
    const XLSX = await import("xlsx");
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    
    // Sheet seç
    const sheetName = config.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      return {
        success: false,
        columns: [],
        preview: [],
        totalRows: 0,
        error: `Sheet bulunamadı: ${sheetName}`,
      };
    }

    // JSON'a çevir
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: config.hasHeader ? undefined : 1,
      range: config.skipRows,
      defval: null,
    });

    const preview = jsonData.slice(0, config.maxRows || 100);
    const headers = preview.length > 0 ? Object.keys(preview[0]) : [];
    const columns = this.analyzeColumns(headers, preview, config.dateFormats);

    return {
      success: true,
      columns,
      preview,
      totalRows: jsonData.length,
    };
  }

  /**
   * JSON dosyasını önizleme için parse eder
   */
  private async parseJSONPreview(
    file: File,
    config: FileUploadConfig
  ): Promise<FilePreviewResult> {
    const text = await file.text();
    let jsonData: unknown;
    
    try {
      jsonData = JSON.parse(text);
    } catch {
      return {
        success: false,
        columns: [],
        preview: [],
        totalRows: 0,
        error: "Geçersiz JSON formatı",
      };
    }

    // Array değilse array'e çevir
    const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
    
    const preview = dataArray.slice(
      config.skipRows,
      config.skipRows + (config.maxRows || 100)
    ) as Record<string, unknown>[];

    const headers = preview.length > 0 ? Object.keys(preview[0]) : [];
    const columns = this.analyzeColumns(headers, preview, config.dateFormats);

    return {
      success: true,
      columns,
      preview,
      totalRows: dataArray.length,
    };
  }

  /**
   * Header isimleri oluşturur
   */
  private generateHeaders(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Column_${i + 1}`);
  }

  /**
   * Kolon bilgilerini analiz eder
   */
  private analyzeColumns(
    headers: string[],
    data: Record<string, unknown>[],
    dateFormats: string[]
  ): ColumnInfo[] {
    return headers.map((header) => {
      const values = data.map((row) => row[header]);
      const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== "");
      const uniqueValues = new Set(nonNullValues.map(String));

      return {
        name: header,
        inferredType: this.inferType(nonNullValues, dateFormats),
        sampleValues: nonNullValues.slice(0, 5),
        nullCount: values.length - nonNullValues.length,
        uniqueCount: uniqueValues.size,
      };
    });
  }

  /**
   * Değerlerden tip çıkarımı yapar
   */
  private inferType(
    values: unknown[],
    dateFormats: string[]
  ): ColumnInfo["inferredType"] {
    if (values.length === 0) return "string";

    const types = values.map((value) => {
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      if (value instanceof Date) return "date";
      if (typeof value === "object") return "json";
      
      const strValue = String(value);
      
      // Boolean kontrolü
      if (["true", "false", "yes", "no", "evet", "hayır", "1", "0"].includes(strValue.toLowerCase())) {
        return "boolean";
      }
      
      // Sayı kontrolü
      if (/^-?\d+\.?\d*$/.test(strValue) && !isNaN(parseFloat(strValue))) {
        return "number";
      }
      
      // Tarih kontrolü
      if (this.isDateString(strValue, dateFormats)) {
        return "date";
      }
      
      return "string";
    });

    // En yaygın tipi bul
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    
    // Eğer birden fazla tip varsa ve çoğunluk yoksa "mixed" döndür
    if (sortedTypes.length > 1 && sortedTypes[0][1] < values.length * 0.8) {
      return "mixed";
    }

    return sortedTypes[0][0] as ColumnInfo["inferredType"];
  }

  /**
   * String'in tarih olup olmadığını kontrol eder
   */
  private isDateString(value: string, formats: string[]): boolean {
    // Basit tarih pattern'leri
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY veya MM/DD/YYYY
      /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/, // ISO datetime
    ];

    for (const pattern of datePatterns) {
      if (pattern.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Tam dosyayı server-side'da parse eder
   */
  async parseFile(
    file: File | Buffer | ArrayBuffer,
    config: FileUploadConfig
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>[];
    error?: string;
  }> {
    try {
      // Bu metod server-side API route'larında kullanılacak
      // Dosya tipi ve config'e göre uygun parser'ı çağır
      
      if (file instanceof File) {
        const result = await this.preview(file, config, Infinity);
        return {
          success: result.success,
          data: result.preview,
          error: result.error,
        };
      }

      // Buffer için XLSX kullan
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(file, { type: "array" });
      const sheetName = config.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        header: config.hasHeader ? undefined : 1,
        range: config.skipRows,
        defval: null,
      });

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

// Singleton instance
export const fileParserService = new FileParserService();
