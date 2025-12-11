/**
 * Chart.js Veri Formatlama Yardımcı Fonksiyonları
 * Supabase verilerini Chart.js formatına dönüştürür
 */

import { type ChartData as ChartJsData } from "chart.js";

// Renk Paletleri
export const CHART_COLORS = {
  primary: [
    "rgba(59, 130, 246, 0.8)",   // Blue
    "rgba(16, 185, 129, 0.8)",   // Green
    "rgba(245, 158, 11, 0.8)",   // Amber
    "rgba(239, 68, 68, 0.8)",    // Red
    "rgba(139, 92, 246, 0.8)",   // Violet
    "rgba(236, 72, 153, 0.8)",   // Pink
    "rgba(6, 182, 212, 0.8)",    // Cyan
    "rgba(249, 115, 22, 0.8)",   // Orange
  ],
  primaryBorder: [
    "rgba(59, 130, 246, 1)",
    "rgba(16, 185, 129, 1)",
    "rgba(245, 158, 11, 1)",
    "rgba(239, 68, 68, 1)",
    "rgba(139, 92, 246, 1)",
    "rgba(236, 72, 153, 1)",
    "rgba(6, 182, 212, 1)",
    "rgba(249, 115, 22, 1)",
  ],
  pastel: [
    "rgba(186, 230, 253, 0.8)",  // Sky
    "rgba(187, 247, 208, 0.8)",  // Green
    "rgba(254, 240, 138, 0.8)",  // Yellow
    "rgba(254, 202, 202, 0.8)",  // Red
    "rgba(221, 214, 254, 0.8)",  // Violet
    "rgba(251, 207, 232, 0.8)",  // Pink
    "rgba(165, 243, 252, 0.8)",  // Cyan
    "rgba(254, 215, 170, 0.8)",  // Orange
  ],
  gradient: {
    blue: ["rgba(59, 130, 246, 0.8)", "rgba(37, 99, 235, 0.4)"],
    green: ["rgba(16, 185, 129, 0.8)", "rgba(5, 150, 105, 0.4)"],
    purple: ["rgba(139, 92, 246, 0.8)", "rgba(124, 58, 237, 0.4)"],
    red: ["rgba(239, 68, 68, 0.8)", "rgba(220, 38, 38, 0.4)"],
  },
} as const;

// Tarih formatlama
export type DateFormat = "day" | "week" | "month" | "year" | "hour" | "full";

export function formatDate(date: Date | string, format: DateFormat = "day"): string {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (format) {
    case "hour":
      return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    case "day":
      return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
    case "week":
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return `Hafta ${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
    case "month":
      return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    case "year":
      return d.getFullYear().toString();
    case "full":
    default:
      return d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  }
}

// Sayı formatlama
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    currency?: string;
    percentage?: boolean;
  } = {}
): string {
  const { decimals = 0, compact = false, currency, percentage = false } = options;

  if (percentage) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  if (currency) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  if (compact) {
    return new Intl.NumberFormat("tr-TR", {
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Gruplama fonksiyonu
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Aggregation fonksiyonları
export type AggregationType = "sum" | "count" | "avg" | "min" | "max";

export function aggregate<T>(
  items: T[],
  valueKey: keyof T,
  type: AggregationType = "sum"
): number {
  if (items.length === 0) return 0;

  const values = items.map((item) => Number(item[valueKey]) || 0);

  switch (type) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "count":
      return items.length;
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

// Supabase veri transform fonksiyonu
export interface TransformConfig<T> {
  /** Label olarak kullanılacak alan */
  labelKey: keyof T;
  /** Değer olarak kullanılacak alan(lar) */
  valueKeys: (keyof T)[];
  /** Dataset başlıkları */
  datasetLabels?: string[];
  /** Gruplama alanı (opsiyonel) */
  groupKey?: keyof T;
  /** Aggregation tipi */
  aggregation?: AggregationType;
  /** Tarih formatı (labelKey tarih ise) */
  dateFormat?: DateFormat;
  /** Sıralama */
  sortBy?: "label" | "value" | "none";
  /** Sıralama yönü */
  sortOrder?: "asc" | "desc";
  /** Renk paleti */
  colorPalette?: "primary" | "pastel";
}

export function transformToChartData<T extends Record<string, unknown>>(
  data: T[],
  config: TransformConfig<T>
): ChartJsData<"bar" | "line"> {
  const {
    labelKey,
    valueKeys,
    datasetLabels,
    groupKey,
    aggregation = "sum",
    dateFormat,
    sortBy = "none",
    sortOrder = "asc",
    colorPalette = "primary",
  } = config;

  let processedData = [...data];

  // Gruplama
  if (groupKey) {
    const grouped = groupBy(processedData, groupKey);
    processedData = Object.entries(grouped).map(([key, items]) => {
      const result: Record<string, unknown> = { [labelKey]: key };
      valueKeys.forEach((vk) => {
        result[vk as string] = aggregate(items, vk as keyof T, aggregation);
      });
      return result as T;
    });
  }

  // Sıralama
  if (sortBy !== "none") {
    processedData.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      if (sortBy === "label") {
        compareA = String(a[labelKey]);
        compareB = String(b[labelKey]);
      } else {
        compareA = Number(a[valueKeys[0]]) || 0;
        compareB = Number(b[valueKeys[0]]) || 0;
      }

      if (typeof compareA === "string" && typeof compareB === "string") {
        return sortOrder === "asc"
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      }

      return sortOrder === "asc"
        ? (compareA as number) - (compareB as number)
        : (compareB as number) - (compareA as number);
    });
  }

  // Label'ları oluştur
  const labels = processedData.map((item) => {
    const rawLabel = item[labelKey];
    if (dateFormat && (rawLabel instanceof Date || typeof rawLabel === "string")) {
      return formatDate(rawLabel as Date | string, dateFormat);
    }
    return String(rawLabel);
  });

  // Dataset'leri oluştur
  const colors = CHART_COLORS[colorPalette];
  const borderColors = CHART_COLORS.primaryBorder;

  const datasets = valueKeys.map((vk, index) => ({
    label: datasetLabels?.[index] || String(vk),
    data: processedData.map((item) => Number(item[vk]) || 0),
    backgroundColor: colors[index % colors.length],
    borderColor: borderColors[index % borderColors.length],
    borderWidth: 2,
  }));

  return { labels, datasets };
}

// Pie/Doughnut chart için transform
export function transformToPieData<T extends Record<string, unknown>>(
  data: T[],
  config: Pick<TransformConfig<T>, "labelKey" | "groupKey" | "aggregation" | "colorPalette"> & {
    valueKey: keyof T;
  }
): ChartJsData<"pie" | "doughnut"> {
  const {
    labelKey,
    valueKey,
    groupKey,
    aggregation = "sum",
    colorPalette = "primary",
  } = config;

  let processedData = [...data];

  if (groupKey) {
    const grouped = groupBy(processedData, groupKey);
    processedData = Object.entries(grouped).map(([key, items]) => ({
      [labelKey]: key,
      [valueKey]: aggregate(items, valueKey as keyof T, aggregation),
    })) as T[];
  }

  const colors = CHART_COLORS[colorPalette];
  const borderColors = CHART_COLORS.primaryBorder;

  return {
    labels: processedData.map((item) => String(item[labelKey])),
    datasets: [
      {
        data: processedData.map((item) => Number(item[valueKey]) || 0),
        backgroundColor: colors.slice(0, processedData.length),
        borderColor: borderColors.slice(0, processedData.length),
        borderWidth: 2,
      },
    ],
  };
}

// Time series için özel transform
export function transformToTimeSeries<T extends Record<string, unknown>>(
  data: T[],
  config: {
    dateKey: keyof T;
    valueKey: keyof T;
    granularity: DateFormat;
    fill?: boolean;
    label?: string;
  }
): ChartJsData<"line"> {
  const { dateKey, valueKey, granularity, fill = true, label = "Değer" } = config;

  // Tarihe göre sırala
  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a[dateKey] as string);
    const dateB = new Date(b[dateKey] as string);
    return dateA.getTime() - dateB.getTime();
  });

  // Tarih grupları oluştur
  const grouped = new Map<string, number[]>();
  sortedData.forEach((item) => {
    const formattedDate = formatDate(item[dateKey] as string, granularity);
    const value = Number(item[valueKey]) || 0;
    if (!grouped.has(formattedDate)) {
      grouped.set(formattedDate, []);
    }
    grouped.get(formattedDate)!.push(value);
  });

  // Ortalamaları hesapla
  const labels: string[] = [];
  const values: number[] = [];
  grouped.forEach((vals, key) => {
    labels.push(key);
    values.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  });

  return {
    labels,
    datasets: [
      {
        label,
        data: values,
        fill,
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };
}

// Scatter plot için transform
export function transformToScatterData<T extends Record<string, unknown>>(
  data: T[],
  config: {
    xKey: keyof T;
    yKey: keyof T;
    labelKey?: keyof T;
    label?: string;
  }
): ChartJsData<"scatter"> {
  const { xKey, yKey, label = "Veri" } = config;

  const points = data.map((item) => ({
    x: Number(item[xKey]) || 0,
    y: Number(item[yKey]) || 0,
  }));

  return {
    datasets: [
      {
        label,
        data: points,
        backgroundColor: "rgba(139, 92, 246, 0.6)",
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 1,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };
}

// KPI hesaplama
export interface KPIResult {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

export function calculateKPI<T extends Record<string, unknown>>(
  data: T[],
  config: {
    valueKey: keyof T;
    dateKey: keyof T;
    currentPeriod: { start: Date; end: Date };
    previousPeriod: { start: Date; end: Date };
  }
): KPIResult {
  const { valueKey, dateKey, currentPeriod, previousPeriod } = config;

  const currentData = data.filter((item) => {
    const date = new Date(item[dateKey] as string);
    return date >= currentPeriod.start && date <= currentPeriod.end;
  });

  const previousData = data.filter((item) => {
    const date = new Date(item[dateKey] as string);
    return date >= previousPeriod.start && date <= previousPeriod.end;
  });

  const current = aggregate(currentData, valueKey, "sum");
  const previous = aggregate(previousData, valueKey, "sum");
  const change = current - previous;
  const changePercent = previous === 0 ? 0 : (change / previous) * 100;

  let trend: "up" | "down" | "stable" = "stable";
  if (changePercent > 1) trend = "up";
  else if (changePercent < -1) trend = "down";

  return { current, previous, change, changePercent, trend };
}
