/**
 * Mini Chart Bileşeni
 * Kart görünümleri için küçük önizleme grafikleri
 */

"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from "react-chartjs-2";
import { useTheme } from "next-themes";

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Filler
);

// Varsayılan renkler
const COLORS = {
  primary: "rgba(59, 130, 246, 0.8)",
  primaryBorder: "rgba(59, 130, 246, 1)",
  secondary: "rgba(16, 185, 129, 0.8)",
  accent: "rgba(139, 92, 246, 0.8)",
  warning: "rgba(245, 158, 11, 0.8)",
  danger: "rgba(239, 68, 68, 0.8)",
  palette: [
    "rgba(59, 130, 246, 0.7)",
    "rgba(16, 185, 129, 0.7)",
    "rgba(245, 158, 11, 0.7)",
    "rgba(239, 68, 68, 0.7)",
    "rgba(139, 92, 246, 0.7)",
    "rgba(236, 72, 153, 0.7)",
  ],
};

// Örnek veri üret
function generateSampleData(type: string, seed: number = 1): number[] {
  const random = (n: number) => {
    const x = Math.sin(seed * n) * 10000;
    return Math.abs(x - Math.floor(x));
  };

  switch (type) {
    case "line":
    case "area":
      return Array.from({ length: 7 }, (_, i) => Math.floor(random(i + 1) * 80) + 20);
    case "bar":
      return Array.from({ length: 5 }, (_, i) => Math.floor(random(i + 1) * 100) + 10);
    case "pie":
    case "doughnut":
      return Array.from({ length: 4 }, (_, i) => Math.floor(random(i + 1) * 40) + 10);
    case "radar":
      return Array.from({ length: 5 }, (_, i) => Math.floor(random(i + 1) * 80) + 20);
    case "scatter":
      return Array.from({ length: 6 }, (_, i) => Math.floor(random(i + 1) * 100));
    default:
      return Array.from({ length: 5 }, (_, i) => Math.floor(random(i + 1) * 100));
  }
}

// Chart türüne göre etiketler
function getLabels(type: string): string[] {
  switch (type) {
    case "line":
    case "area":
      return ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    case "bar":
      return ["A", "B", "C", "D", "E"];
    case "pie":
    case "doughnut":
      return ["Segment 1", "Segment 2", "Segment 3", "Segment 4"];
    case "radar":
      return ["Hız", "Güç", "Dayanıklılık", "Esneklik", "Denge"];
    default:
      return ["1", "2", "3", "4", "5"];
  }
}

interface MiniChartProps {
  /** Grafik türü */
  type: "line" | "bar" | "pie" | "area" | "scatter" | "heatmap" | "radar" | "combo" | string;
  /** Grafik id'si (seed olarak kullanılır) */
  chartId?: string;
  /** Yükseklik (px) */
  height?: number;
  /** Özel config varsa */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

export function MiniChart({ type, chartId, height = 120, config }: MiniChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Seed hesapla - chartId varsa hash'le, yoksa sabit değer kullan
  const seed = useMemo(() => {
    if (chartId) {
      let hash = 0;
      for (let i = 0; i < chartId.length; i++) {
        hash = ((hash << 5) - hash) + chartId.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }
    // Sabit seed değeri (Math.random yerine)
    return 42;
  }, [chartId]);

  // Veri oluştur
  const sampleData = useMemo(() => generateSampleData(type, seed), [type, seed]);
  const labels = useMemo(() => getLabels(type), [type]);

  // Ortak seçenekler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 2 },
    },
    animation: {
      duration: 500,
    },
  };

  // Grafik türüne göre render
  switch (type) {
    case "line": {
      const data: ChartData<"line"> = {
        labels,
        datasets: [
          {
            data: sampleData,
            borderColor: COLORS.primaryBorder,
            backgroundColor: "transparent",
            tension: 0.4,
            fill: false,
          },
        ],
      };
      return (
        <div style={{ height }}>
          <Line data={data} options={baseOptions} />
        </div>
      );
    }

    case "area": {
      const data: ChartData<"line"> = {
        labels,
        datasets: [
          {
            data: sampleData,
            borderColor: COLORS.primaryBorder,
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.3)",
            tension: 0.4,
            fill: true,
          },
        ],
      };
      return (
        <div style={{ height }}>
          <Line data={data} options={baseOptions} />
        </div>
      );
    }

    case "bar": {
      const data: ChartData<"bar"> = {
        labels,
        datasets: [
          {
            data: sampleData,
            backgroundColor: COLORS.palette.slice(0, sampleData.length),
            borderRadius: 4,
          },
        ],
      };
      return (
        <div style={{ height }}>
          <Bar data={data} options={baseOptions} />
        </div>
      );
    }

    case "pie": {
      const data: ChartData<"pie"> = {
        labels,
        datasets: [
          {
            data: sampleData,
            backgroundColor: COLORS.palette.slice(0, sampleData.length),
            borderWidth: 0,
          },
        ],
      };
      const pieOptions: ChartOptions<"pie"> = {
        ...baseOptions,
        scales: undefined,
      };
      return (
        <div style={{ height }}>
          <Pie data={data} options={pieOptions} />
        </div>
      );
    }

    case "radar": {
      const data: ChartData<"radar"> = {
        labels,
        datasets: [
          {
            data: sampleData,
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.3)",
            borderColor: COLORS.primaryBorder,
            borderWidth: 2,
          },
        ],
      };
      const radarOptions: ChartOptions<"radar"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          r: {
            display: false,
            beginAtZero: true,
          },
        },
        animation: {
          duration: 500,
        },
      };
      return (
        <div style={{ height }}>
          <Radar data={data} options={radarOptions} />
        </div>
      );
    }

    case "heatmap":
    case "scatter":
    case "combo":
    default: {
      // Bu türler için bar chart göster (fallback)
      const data: ChartData<"bar"> = {
        labels: labels.slice(0, 5),
        datasets: [
          {
            data: sampleData.slice(0, 5),
            backgroundColor: COLORS.palette.slice(0, 5),
            borderRadius: 4,
          },
        ],
      };
      return (
        <div style={{ height }}>
          <Bar data={data} options={baseOptions} />
        </div>
      );
    }
  }
}

export default MiniChart;
