/**
 * useSupabaseChart Hook
 * Supabase'den veri çekip Chart.js formatına dönüştüren hook
 * Realtime subscription desteği ile otomatik güncelleme
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Chart.js veri yapısı
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

// Hook konfigürasyonu
export interface UseSupabaseChartConfig<T> {
  /** Supabase tablo adı */
  table: string;
  /** Seçilecek kolonlar (varsayılan: "*") */
  select?: string;
  /** Label için kullanılacak kolon */
  labelColumn: string;
  /** Değer için kullanılacak kolon(lar) */
  valueColumns: string | string[];
  /** Her dataset için etiketler (valueColumns ile aynı sırada) */
  datasetLabels?: string[];
  /** Filtre koşulları */
  filters?: {
    column: string;
    operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in";
    value: unknown;
  }[];
  /** Sıralama */
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  /** Limit */
  limit?: number;
  /** Realtime subscription aktif mi */
  realtime?: boolean;
  /** Veri dönüşüm fonksiyonu (opsiyonel) */
  transform?: (data: T[]) => T[];
  /** Renk paleti */
  colors?: string[];
}

// Varsayılan renkler
const DEFAULT_COLORS = [
  "rgba(59, 130, 246, 0.8)",   // blue
  "rgba(16, 185, 129, 0.8)",   // green
  "rgba(245, 158, 11, 0.8)",   // amber
  "rgba(239, 68, 68, 0.8)",    // red
  "rgba(139, 92, 246, 0.8)",   // violet
  "rgba(236, 72, 153, 0.8)",   // pink
  "rgba(6, 182, 212, 0.8)",    // cyan
  "rgba(249, 115, 22, 0.8)",   // orange
];

const DEFAULT_BORDER_COLORS = [
  "rgba(59, 130, 246, 1)",
  "rgba(16, 185, 129, 1)",
  "rgba(245, 158, 11, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(139, 92, 246, 1)",
  "rgba(236, 72, 153, 1)",
  "rgba(6, 182, 212, 1)",
  "rgba(249, 115, 22, 1)",
];

export interface UseSupabaseChartResult {
  /** Chart.js uyumlu veri */
  chartData: ChartData;
  /** Yükleniyor durumu */
  loading: boolean;
  /** Hata mesajı */
  error: string | null;
  /** Veriyi manuel yenile */
  refresh: () => Promise<void>;
  /** Ham veri */
  rawData: unknown[];
  /** Son güncelleme zamanı */
  lastUpdated: Date | null;
}

export function useSupabaseChart<T extends Record<string, unknown>>(
  config: UseSupabaseChartConfig<T>
): UseSupabaseChartResult {
  const [rawData, setRawData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const {
    table,
    select = "*",
    labelColumn,
    valueColumns,
    datasetLabels,
    filters,
    orderBy,
    limit,
    realtime = false,
    transform,
    colors = DEFAULT_COLORS,
  } = config;

  // Veri çekme fonksiyonu
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from(table).select(select);

      // Filtreleri uygula
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          const value = filter.value as string | number | boolean | string[] | number[];
          switch (filter.operator) {
            case "eq":
              query = query.eq(filter.column, value);
              break;
            case "neq":
              query = query.neq(filter.column, value);
              break;
            case "gt":
              query = query.gt(filter.column, value);
              break;
            case "gte":
              query = query.gte(filter.column, value);
              break;
            case "lt":
              query = query.lt(filter.column, value);
              break;
            case "lte":
              query = query.lte(filter.column, value);
              break;
            case "like":
              query = query.like(filter.column, value as string);
              break;
            case "ilike":
              query = query.ilike(filter.column, value as string);
              break;
            case "in":
              query = query.in(filter.column, value as string[] | number[]);
              break;
          }
        }
      }

      // Sıralama
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      let processedData = (data as T[]) || [];

      // Transform uygula
      if (transform) {
        processedData = transform(processedData);
      }

      setRawData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message);
      console.error("Supabase chart data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, table, select, filters, orderBy, limit, transform]);

  // Chart.js formatına dönüştür
  const chartData = useMemo((): ChartData => {
    if (rawData.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Labels oluştur
    const labels = rawData.map((item) => String(item[labelColumn] || ""));

    // Value columns'u array'e çevir
    const valueColumnsArray = Array.isArray(valueColumns) ? valueColumns : [valueColumns];

    // Datasets oluştur
    const datasets: ChartDataset[] = valueColumnsArray.map((col, index) => {
      const data = rawData.map((item) => {
        const value = item[col];
        return typeof value === "number" ? value : parseFloat(String(value)) || 0;
      });

      return {
        label: datasetLabels?.[index] || col,
        data,
        backgroundColor: colors[index % colors.length],
        borderColor: DEFAULT_BORDER_COLORS[index % DEFAULT_BORDER_COLORS.length],
        borderWidth: 2,
      };
    });

    return { labels, datasets };
  }, [rawData, labelColumn, valueColumns, datasetLabels, colors]);

  // İlk yükleme
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!realtime) return;

    let channel: RealtimeChannel;

    const setupRealtime = () => {
      channel = supabase
        .channel(`chart-${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
          },
          () => {
            // Veri değiştiğinde yeniden çek
            fetchData();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [realtime, supabase, table, fetchData]);

  return {
    chartData,
    loading,
    error,
    refresh: fetchData,
    rawData,
    lastUpdated,
  };
}

export default useSupabaseChart;
