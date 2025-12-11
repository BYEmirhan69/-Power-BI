/**
 * Chart.js React Wrapper Bileşenleri
 * Supabase hook'u ile entegre çalışan dinamik grafikler
 */

"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData as ChartJsData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Radar, PolarArea, Scatter } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartData as SupabaseChartData } from "@/hooks/use-supabase-chart";

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Ortak props
export interface BaseChartProps {
  /** Grafik başlığı */
  title?: string;
  /** Grafik açıklaması */
  description?: string;
  /** Yükleniyor durumu */
  loading?: boolean;
  /** Hata mesajı */
  error?: string | null;
  /** Yenile fonksiyonu */
  onRefresh?: () => void;
  /** Yükseklik (px veya string) */
  height?: number | string;
  /** Kart içinde göster */
  showCard?: boolean;
  /** Son güncelleme zamanı */
  lastUpdated?: Date | null;
  /** Ek className */
  className?: string;
}

// Tema bazlı varsayılan ayarlar
function useChartDefaults() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return {
    color: isDark ? "#e2e8f0" : "#334155",
    gridColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    backgroundColor: isDark ? "#1e293b" : "#ffffff",
  };
}

// Loading Spinner
function ChartLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Error State
function ChartError({ error, onRefresh }: { error: string; onRefresh?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground text-center">{error}</p>
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      )}
    </div>
  );
}

// Chart Wrapper
function ChartWrapper({
  title,
  description,
  loading,
  error,
  onRefresh,
  showCard = true,
  lastUpdated,
  className,
  children,
}: BaseChartProps & { children: React.ReactNode }) {
  const content = (
    <>
      {loading ? (
        <ChartLoading />
      ) : error ? (
        <ChartError error={error} onRefresh={onRefresh} />
      ) : (
        children
      )}
    </>
  );

  if (!showCard) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            {title && <CardTitle className="text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {lastUpdated.toLocaleTimeString("tr-TR")}
              </span>
            )}
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// ============================================
// BAR CHART
// ============================================
export interface BarChartProps extends BaseChartProps {
  data: SupabaseChartData;
  horizontal?: boolean;
}

export function SupabaseBarChart({
  data,
  horizontal = false,
  height = 300,
  ...props
}: BarChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"bar"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor,
      borderWidth: ds.borderWidth ?? 2,
    })),
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: defaults.color },
      },
    },
    scales: {
      x: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
      y: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Bar data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// LINE CHART
// ============================================
export interface LineChartProps extends BaseChartProps {
  data: SupabaseChartData;
  fill?: boolean;
  smooth?: boolean;
}

export function SupabaseLineChart({
  data,
  fill = false,
  smooth = true,
  height = 300,
  ...props
}: LineChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"line"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor,
      borderWidth: ds.borderWidth ?? 2,
      fill: ds.fill ?? fill,
      tension: ds.tension ?? (smooth ? 0.4 : 0),
    })),
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: defaults.color },
      },
    },
    scales: {
      x: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
      y: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Line data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// PIE CHART
// ============================================
export interface PieChartProps extends BaseChartProps {
  data: SupabaseChartData;
}

export function SupabasePieChart({ data, height = 300, ...props }: PieChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"pie"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      data: ds.data,
      backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [ds.backgroundColor],
      borderColor: Array.isArray(ds.borderColor) ? ds.borderColor : [ds.borderColor],
      borderWidth: ds.borderWidth ?? 2,
    })),
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: defaults.color },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Pie data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// DOUGHNUT CHART
// ============================================
export interface DoughnutChartProps extends BaseChartProps {
  data: SupabaseChartData;
}

export function SupabaseDoughnutChart({ data, height = 300, ...props }: DoughnutChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"doughnut"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      data: ds.data,
      backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [ds.backgroundColor],
      borderColor: Array.isArray(ds.borderColor) ? ds.borderColor : [ds.borderColor],
      borderWidth: ds.borderWidth ?? 2,
    })),
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: defaults.color },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// RADAR CHART
// ============================================
export interface RadarChartProps extends BaseChartProps {
  data: SupabaseChartData;
}

export function SupabaseRadarChart({ data, height = 300, ...props }: RadarChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"radar"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor,
      borderWidth: ds.borderWidth ?? 2,
    })),
  };

  const options: ChartOptions<"radar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: defaults.color },
      },
    },
    scales: {
      r: {
        grid: { color: defaults.gridColor },
        angleLines: { color: defaults.gridColor },
        pointLabels: { color: defaults.color },
        ticks: { color: defaults.color, backdropColor: "transparent" },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Radar data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// POLAR AREA CHART
// ============================================
export interface PolarAreaChartProps extends BaseChartProps {
  data: SupabaseChartData;
}

export function SupabasePolarAreaChart({ data, height = 300, ...props }: PolarAreaChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"polarArea"> = {
    labels: data.labels,
    datasets: data.datasets.map((ds) => ({
      data: ds.data,
      backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : [ds.backgroundColor],
      borderColor: Array.isArray(ds.borderColor) ? ds.borderColor : [ds.borderColor],
      borderWidth: ds.borderWidth ?? 2,
    })),
  };

  const options: ChartOptions<"polarArea"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: { color: defaults.color },
      },
    },
    scales: {
      r: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color, backdropColor: "transparent" },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <PolarArea data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// ============================================
// SCATTER CHART
// ============================================
export interface ScatterChartProps extends BaseChartProps {
  data: { x: number; y: number }[];
  label?: string;
}

export function SupabaseScatterChart({
  data,
  label = "Veri",
  height = 300,
  ...props
}: ScatterChartProps) {
  const defaults = useChartDefaults();

  const chartData: ChartJsData<"scatter"> = {
    datasets: [
      {
        label,
        data,
        backgroundColor: "rgba(139, 92, 246, 0.6)",
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 1,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const options: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: defaults.color },
      },
    },
    scales: {
      x: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
      y: {
        grid: { color: defaults.gridColor },
        ticks: { color: defaults.color },
      },
    },
  };

  return (
    <ChartWrapper {...props}>
      <div style={{ height: typeof height === "number" ? `${height}px` : height }}>
        <Scatter data={chartData} options={options} />
      </div>
    </ChartWrapper>
  );
}

// Export all
export { ChartLoading, ChartError, ChartWrapper };
