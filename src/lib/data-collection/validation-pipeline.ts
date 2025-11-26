/**
 * Data Validation Pipeline
 * Veri doğrulama ve temizleme işlemleri
 */

import {
  ValidationResult,
  ValidationIssue,
  ValidationRule,
  CleaningOptions,
  ValidationSeverity,
  ColumnInfo,
} from "@/types/data-collection.types";

export class ValidationPipeline {
  /**
   * Veriyi doğrular ve temizler
   */
  validate(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    rules?: ValidationRule[],
    cleaningOptions?: Partial<CleaningOptions>
  ): ValidationResult {
    const options = this.getDefaultCleaningOptions(cleaningOptions);
    const issues: ValidationIssue[] = [];
    let cleanedData = [...data];
    let autoFixedCount = 0;

    // 1. Otomatik kurallar oluştur (eğer kural verilmemişse)
    const allRules = rules || this.generateAutoRules(columns);

    // 2. Her satır için doğrulama yap
    cleanedData.forEach((row, rowIndex) => {
      const rowIssues = this.validateRow(row, rowIndex, allRules, columns, options);
      issues.push(...rowIssues);
    });

    // 3. Temizleme işlemleri
    if (options.trimStrings) {
      cleanedData = this.trimStrings(cleanedData);
    }

    if (options.removeExtraSpaces) {
      cleanedData = this.removeExtraSpaces(cleanedData);
    }

    if (options.removeDuplicates) {
      const { data: dedupedData, removed } = this.removeDuplicates(
        cleanedData,
        options.duplicateColumns,
        options.keepDuplicate
      );
      cleanedData = dedupedData;
      
      if (removed > 0) {
        issues.push({
          rule: "unique",
          severity: "info",
          message: `${removed} duplicate kayıt kaldırıldı`,
          fixed: true,
        });
        autoFixedCount += removed;
      }
    }

    if (options.standardizeDates) {
      cleanedData = this.standardizeDates(cleanedData, columns, options.targetDateFormat);
    }

    if (options.handleNulls !== "keep") {
      const { data: handledData, fixed } = this.handleNulls(
        cleanedData,
        columns,
        options
      );
      cleanedData = handledData;
      autoFixedCount += fixed;
    }

    if (options.removeOutliers) {
      const { data: outlierHandled, removed } = this.handleOutliers(
        cleanedData,
        columns,
        options.outlierMethod,
        options.outlierThreshold
      );
      cleanedData = outlierHandled;
      
      if (removed > 0) {
        issues.push({
          rule: "range",
          severity: "warning",
          message: `${removed} outlier değer tespit edildi`,
          fixed: false,
        });
      }
    }

    // 4. Sonuçları hesapla
    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const infos = issues.filter((i) => i.severity === "info").length;

    return {
      isValid: errors === 0,
      totalRows: data.length,
      validRows: data.length - issues.filter((i) => i.severity === "error" && i.row !== undefined).length,
      issues,
      summary: {
        errors,
        warnings,
        infos,
        autoFixed: autoFixedCount,
      },
      cleanedData,
    };
  }

  /**
   * Varsayılan temizleme seçeneklerini döndürür
   */
  private getDefaultCleaningOptions(options?: Partial<CleaningOptions>): CleaningOptions {
    return {
      handleNulls: options?.handleNulls || "keep",
      defaultValues: options?.defaultValues || {},
      trimStrings: options?.trimStrings ?? true,
      removeExtraSpaces: options?.removeExtraSpaces ?? true,
      normalizeEncoding: options?.normalizeEncoding ?? true,
      removeOutliers: options?.removeOutliers ?? false,
      outlierMethod: options?.outlierMethod || "iqr",
      outlierThreshold: options?.outlierThreshold || 1.5,
      standardizeDates: options?.standardizeDates ?? true,
      targetDateFormat: options?.targetDateFormat || "YYYY-MM-DD",
      removeDuplicates: options?.removeDuplicates ?? false,
      duplicateColumns: options?.duplicateColumns,
      keepDuplicate: options?.keepDuplicate || "first",
      enforceTypes: options?.enforceTypes ?? true,
      typeCoercion: options?.typeCoercion,
    };
  }

  /**
   * Kolon bilgilerinden otomatik kurallar oluşturur
   */
  private generateAutoRules(columns: ColumnInfo[]): ValidationRule[] {
    const rules: ValidationRule[] = [];

    columns.forEach((col) => {
      // Tip kontrolü
      rules.push({
        column: col.name,
        type: "type",
        params: { expectedType: col.inferredType },
        severity: "warning",
        autoFix: true,
      });

      // Required kontrolü (nullCount düşükse required olabilir)
      if (col.nullCount === 0) {
        rules.push({
          column: col.name,
          type: "required",
          severity: "error",
          autoFix: false,
        });
      }
    });

    return rules;
  }

  /**
   * Tek bir satırı doğrular
   */
  private validateRow(
    row: Record<string, unknown>,
    rowIndex: number,
    rules: ValidationRule[],
    columns: ColumnInfo[],
    options: CleaningOptions
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const rule of rules) {
      const value = row[rule.column];
      const issue = this.checkRule(value, rule, rowIndex, columns, options);
      if (issue) {
        issues.push(issue);
      }
    }

    return issues;
  }

  /**
   * Tek bir kuralı kontrol eder
   */
  private checkRule(
    value: unknown,
    rule: ValidationRule,
    rowIndex: number,
    columns: ColumnInfo[],
    options: CleaningOptions
  ): ValidationIssue | null {
    switch (rule.type) {
      case "required":
        if (this.isEmpty(value)) {
          return {
            row: rowIndex,
            column: rule.column,
            value,
            rule: "required",
            severity: rule.severity,
            message: rule.message || `${rule.column} alanı boş olamaz`,
          };
        }
        break;

      case "type":
        const expectedType = rule.params?.expectedType as string;
        if (!this.isEmpty(value) && !this.checkType(value, expectedType)) {
          return {
            row: rowIndex,
            column: rule.column,
            value,
            rule: "type",
            severity: rule.severity,
            message: rule.message || `${rule.column} alanı ${expectedType} tipinde olmalı`,
            suggestedFix: this.suggestTypeFix(value, expectedType),
          };
        }
        break;

      case "range":
        if (typeof value === "number") {
          const min = rule.params?.min as number | undefined;
          const max = rule.params?.max as number | undefined;
          if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
            return {
              row: rowIndex,
              column: rule.column,
              value,
              rule: "range",
              severity: rule.severity,
              message: rule.message || `${rule.column} değeri ${min ?? "-∞"}-${max ?? "∞"} aralığında olmalı`,
            };
          }
        }
        break;

      case "format":
        const pattern = rule.params?.pattern as string;
        if (pattern && typeof value === "string" && !new RegExp(pattern).test(value)) {
          return {
            row: rowIndex,
            column: rule.column,
            value,
            rule: "format",
            severity: rule.severity,
            message: rule.message || `${rule.column} formatı geçersiz`,
          };
        }
        break;
    }

    return null;
  }

  /**
   * Değerin boş olup olmadığını kontrol eder
   */
  private isEmpty(value: unknown): boolean {
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" && value.trim() === "")
    );
  }

  /**
   * Değerin beklenen tipte olup olmadığını kontrol eder
   */
  private checkType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case "number":
        return typeof value === "number" || !isNaN(Number(value));
      case "string":
        return typeof value === "string";
      case "boolean":
        return (
          typeof value === "boolean" ||
          ["true", "false", "1", "0", "yes", "no"].includes(String(value).toLowerCase())
        );
      case "date":
        if (value instanceof Date) return !isNaN(value.getTime());
        const date = new Date(String(value));
        return !isNaN(date.getTime());
      default:
        return true;
    }
  }

  /**
   * Tip dönüşümü için öneri yapar
   */
  private suggestTypeFix(value: unknown, expectedType: string): unknown {
    switch (expectedType) {
      case "number":
        const num = Number(String(value).replace(/[^0-9.-]/g, ""));
        return isNaN(num) ? null : num;
      case "boolean":
        const str = String(value).toLowerCase();
        if (["true", "yes", "1", "evet"].includes(str)) return true;
        if (["false", "no", "0", "hayır"].includes(str)) return false;
        return null;
      case "date":
        const date = new Date(String(value));
        return isNaN(date.getTime()) ? null : date.toISOString();
      default:
        return String(value);
    }
  }

  /**
   * String değerleri trim eder
   */
  private trimStrings(data: Record<string, unknown>[]): Record<string, unknown>[] {
    return data.map((row) => {
      const newRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        newRow[key] = typeof value === "string" ? value.trim() : value;
      }
      return newRow;
    });
  }

  /**
   * Fazla boşlukları kaldırır
   */
  private removeExtraSpaces(data: Record<string, unknown>[]): Record<string, unknown>[] {
    return data.map((row) => {
      const newRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        newRow[key] =
          typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value;
      }
      return newRow;
    });
  }

  /**
   * Duplicate kayıtları kaldırır
   */
  private removeDuplicates(
    data: Record<string, unknown>[],
    columns?: string[],
    keep: "first" | "last" = "first"
  ): { data: Record<string, unknown>[]; removed: number } {
    const seen = new Map<string, number>();
    const result: Record<string, unknown>[] = [];
    let removed = 0;

    const processedData = keep === "last" ? [...data].reverse() : data;

    for (const row of processedData) {
      const key = columns
        ? columns.map((col) => String(row[col] ?? "")).join("|")
        : Object.values(row).map(String).join("|");

      if (!seen.has(key)) {
        seen.set(key, 1);
        result.push(row);
      } else {
        removed++;
      }
    }

    return {
      data: keep === "last" ? result.reverse() : result,
      removed,
    };
  }

  /**
   * Tarihleri standart formata dönüştürür
   */
  private standardizeDates(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    targetFormat: string
  ): Record<string, unknown>[] {
    const dateColumns = columns
      .filter((col) => col.inferredType === "date")
      .map((col) => col.name);

    if (dateColumns.length === 0) return data;

    return data.map((row) => {
      const newRow = { ...row };
      for (const col of dateColumns) {
        const value = row[col];
        if (value) {
          const date = new Date(String(value));
          if (!isNaN(date.getTime())) {
            newRow[col] = this.formatDate(date, targetFormat);
          }
        }
      }
      return newRow;
    });
  }

  /**
   * Tarihi belirtilen formatta formatlar
   */
  private formatDate(date: Date, format: string): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds);
  }

  /**
   * Null değerleri işler
   */
  private handleNulls(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    options: CleaningOptions
  ): { data: Record<string, unknown>[]; fixed: number } {
    let fixed = 0;

    switch (options.handleNulls) {
      case "remove_row":
        const filtered = data.filter((row) =>
          !Object.values(row).some((v) => this.isEmpty(v))
        );
        return { data: filtered, fixed: data.length - filtered.length };

      case "fill_default":
        return {
          data: data.map((row) => {
            const newRow = { ...row };
            for (const [key, value] of Object.entries(row)) {
              if (this.isEmpty(value) && options.defaultValues?.[key] !== undefined) {
                newRow[key] = options.defaultValues[key];
                fixed++;
              }
            }
            return newRow;
          }),
          fixed,
        };

      case "fill_previous":
        const result: Record<string, unknown>[] = [];
        const lastValues: Record<string, unknown> = {};
        
        for (const row of data) {
          const newRow = { ...row };
          for (const [key, value] of Object.entries(row)) {
            if (this.isEmpty(value) && lastValues[key] !== undefined) {
              newRow[key] = lastValues[key];
              fixed++;
            } else if (!this.isEmpty(value)) {
              lastValues[key] = value;
            }
          }
          result.push(newRow);
        }
        return { data: result, fixed };

      case "fill_mean":
        // Sayısal kolonlar için ortalama hesapla
        const means: Record<string, number> = {};
        const numericColumns = columns
          .filter((col) => col.inferredType === "number")
          .map((col) => col.name);

        for (const col of numericColumns) {
          const values = data
            .map((row) => row[col])
            .filter((v): v is number => typeof v === "number");
          if (values.length > 0) {
            means[col] = values.reduce((a, b) => a + b, 0) / values.length;
          }
        }

        return {
          data: data.map((row) => {
            const newRow = { ...row };
            for (const col of numericColumns) {
              if (this.isEmpty(row[col]) && means[col] !== undefined) {
                newRow[col] = means[col];
                fixed++;
              }
            }
            return newRow;
          }),
          fixed,
        };

      default:
        return { data, fixed: 0 };
    }
  }

  /**
   * Outlier değerleri işler
   */
  private handleOutliers(
    data: Record<string, unknown>[],
    columns: ColumnInfo[],
    method: "iqr" | "zscore" | "percentile",
    threshold: number
  ): { data: Record<string, unknown>[]; removed: number } {
    const numericColumns = columns
      .filter((col) => col.inferredType === "number")
      .map((col) => col.name);

    let totalRemoved = 0;

    // Her sayısal kolon için outlier boundaries hesapla
    const bounds: Record<string, { lower: number; upper: number }> = {};

    for (const col of numericColumns) {
      const values = data
        .map((row) => row[col])
        .filter((v): v is number => typeof v === "number")
        .sort((a, b) => a - b);

      if (values.length < 4) continue;

      if (method === "iqr") {
        const q1 = values[Math.floor(values.length * 0.25)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        bounds[col] = {
          lower: q1 - threshold * iqr,
          upper: q3 + threshold * iqr,
        };
      } else if (method === "zscore") {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(
          values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
        );
        bounds[col] = {
          lower: mean - threshold * std,
          upper: mean + threshold * std,
        };
      } else if (method === "percentile") {
        const lowerIdx = Math.floor(values.length * (threshold / 100));
        const upperIdx = Math.floor(values.length * (1 - threshold / 100));
        bounds[col] = {
          lower: values[lowerIdx],
          upper: values[upperIdx],
        };
      }
    }

    // Outlier içeren satırları işaretle
    const processedData = data.map((row) => {
      const newRow = { ...row, __hasOutlier: false };
      for (const col of numericColumns) {
        const value = row[col];
        if (
          typeof value === "number" &&
          bounds[col] &&
          (value < bounds[col].lower || value > bounds[col].upper)
        ) {
          newRow.__hasOutlier = true;
          totalRemoved++;
        }
      }
      return newRow;
    });

    // __hasOutlier alanını kaldır ve sonucu döndür
    return {
      data: processedData.map(({ __hasOutlier, ...row }) => row),
      removed: totalRemoved,
    };
  }

  /**
   * Hızlı doğrulama - sadece hata sayısını döndürür
   */
  quickValidate(data: Record<string, unknown>[], columns: ColumnInfo[]): {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
  } {
    let errorCount = 0;
    let warningCount = 0;

    const rules = this.generateAutoRules(columns);

    for (let i = 0; i < data.length; i++) {
      for (const rule of rules) {
        const value = data[i][rule.column];
        
        if (rule.type === "required" && this.isEmpty(value)) {
          if (rule.severity === "error") errorCount++;
          else warningCount++;
        }
        
        if (rule.type === "type" && !this.isEmpty(value)) {
          const expectedType = rule.params?.expectedType as string;
          if (!this.checkType(value, expectedType)) {
            if (rule.severity === "error") errorCount++;
            else warningCount++;
          }
        }
      }
    }

    return {
      isValid: errorCount === 0,
      errorCount,
      warningCount,
    };
  }
}

// Singleton instance
export const validationPipeline = new ValidationPipeline();
