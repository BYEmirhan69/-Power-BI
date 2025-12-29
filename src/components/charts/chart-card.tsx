/**
 * Chart Card Bileşeni
 * Grafik kartları için gerçek veri ile önizleme
 */

"use client";

import { useMemo } from "react";
import { useDatasetData } from "@/hooks/use-swr-data";
import { MiniChart } from "./mini-chart";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartConfig {
  xColumn?: string;
  yColumn?: string;
  schema?: { name: string; type: string }[];
  [key: string]: unknown;
}

interface ChartCardProps {
  chartId: string;
  chartType: string;
  datasetId?: string | null;
  config?: ChartConfig | null;
  height?: number;
}

export function ChartCard({
  chartId,
  chartType,
  datasetId,
  config,
  height = 112,
}: ChartCardProps) {
  // Dataset verisi - sadece datasetId varsa çek
  const { data: datasetData, isLoading } = useDatasetData(
    datasetId || null,
    100 // İlk 100 satır yeterli önizleme için
  );

  // Grafik verisini hazırla
  const chartData = useMemo(() => {
    if (!datasetId || !config || !datasetData || datasetData.length === 0) {
      return null;
    }

    const xColumn = config.xColumn;
    const yColumn = config.yColumn;

    if (!xColumn || !yColumn) {
      return null;
    }

    // İlk 30 satırı al (grafik için yeterli)
    const slicedData = datasetData.slice(0, 30);

    return {
      data: slicedData.map((row: Record<string, unknown>) => Number(row[yColumn]) || 0),
      labels: slicedData.map((row: Record<string, unknown>) => String(row[xColumn] || '')),
    };
  }, [datasetId, config, datasetData]);

  // Loading durumu
  if (datasetId && isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  // Gerçek veri varsa göster
  if (chartData && chartData.data.length > 0) {
    return (
      <MiniChart
        type={chartType}
        chartId={chartId}
        data={chartData.data}
        labels={chartData.labels}
        height={height}
        showTooltip={true}
        showAxes={true}
      />
    );
  }

  // Gerçek veri yoksa örnek veri ile göster
  return (
    <MiniChart
      type={chartType}
      chartId={chartId}
      height={height}
    />
  );
}
