"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";

interface HeatmapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

interface DynamicHeatmapChartProps {
  data: HeatmapDataPoint[];
  xLabels?: string[];
  yLabels?: string[];
  height?: number;
  colorScale?: {
    min: string;
    mid?: string;
    max: string;
  };
  showValues?: boolean;
  showTooltip?: boolean;
  cellSize?: number;
  cellGap?: number;
  valueFormat?: (value: number) => string;
}

const DEFAULT_COLOR_SCALE = {
  min: "#e0f2fe", // sky-100
  mid: "#38bdf8", // sky-400
  max: "#0369a1", // sky-700
};

const DEFAULT_COLOR_SCALE_DARK = {
  min: "#0c4a6e", // sky-900
  mid: "#0284c7", // sky-600
  max: "#7dd3fc", // sky-300
};

export function DynamicHeatmapChart({
  data,
  xLabels: providedXLabels,
  yLabels: providedYLabels,
  height = 300,
  colorScale,
  showValues = true,
  showTooltip = true,
  cellSize = 40,
  cellGap = 2,
  valueFormat = (v) => v.toFixed(0),
}: DynamicHeatmapChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Renk skalası
  const colors = colorScale || (isDark ? DEFAULT_COLOR_SCALE_DARK : DEFAULT_COLOR_SCALE);

  // X ve Y etiketlerini veriden çıkar veya sağlananları kullan
  const { xLabels, yLabels } = useMemo(() => {
    const uniqueX = providedXLabels || [...new Set(data.map((d) => String(d.x)))];
    const uniqueY = providedYLabels || [...new Set(data.map((d) => String(d.y)))];
    return { xLabels: uniqueX, yLabels: uniqueY };
  }, [data, providedXLabels, providedYLabels]);

  // Min-max değerleri hesapla
  const { minValue, maxValue } = useMemo(() => {
    const values = data.map((d) => d.value);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [data]);

  // Değere göre renk hesapla
  const getColor = (value: number): string => {
    const range = maxValue - minValue;
    if (range === 0) return colors.mid || colors.min;

    const normalized = (value - minValue) / range;

    // RGB interpolasyonu
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgbToHex = (r: number, g: number, b: number) =>
      `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

    const minRgb = hexToRgb(colors.min);
    const maxRgb = hexToRgb(colors.max);

    if (colors.mid && normalized < 0.5) {
      const midRgb = hexToRgb(colors.mid);
      const t = normalized * 2;
      return rgbToHex(
        minRgb.r + (midRgb.r - minRgb.r) * t,
        minRgb.g + (midRgb.g - minRgb.g) * t,
        minRgb.b + (midRgb.b - minRgb.b) * t
      );
    } else if (colors.mid) {
      const midRgb = hexToRgb(colors.mid);
      const t = (normalized - 0.5) * 2;
      return rgbToHex(
        midRgb.r + (maxRgb.r - midRgb.r) * t,
        midRgb.g + (maxRgb.g - midRgb.g) * t,
        midRgb.b + (maxRgb.b - midRgb.b) * t
      );
    }

    return rgbToHex(
      minRgb.r + (maxRgb.r - minRgb.r) * normalized,
      minRgb.g + (maxRgb.g - minRgb.g) * normalized,
      minRgb.b + (maxRgb.b - minRgb.b) * normalized
    );
  };

  // Veriyi matris formatına dönüştür
  const matrix = useMemo(() => {
    const dataMap = new Map(data.map((d) => [`${d.x}-${d.y}`, d]));
    return yLabels.map((y) =>
      xLabels.map((x) => dataMap.get(`${x}-${y}`) || { x, y, value: 0 })
    );
  }, [data, xLabels, yLabels]);

  // Boyutları hesapla
  const labelWidth = 80;
  const labelHeight = 30;
  const chartWidth = xLabels.length * (cellSize + cellGap) + labelWidth;
  const chartHeight = yLabels.length * (cellSize + cellGap) + labelHeight;

  // Metin rengini arka plana göre belirle
  const getTextColor = (bgColor: string): string => {
    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(bgColor);
    if (!rgb) return isDark ? "#f1f5f9" : "#0f172a";
    
    const luminance =
      (parseInt(rgb[1], 16) * 299 +
        parseInt(rgb[2], 16) * 587 +
        parseInt(rgb[3], 16) * 114) /
      1000;
    
    return luminance > 128 ? "#0f172a" : "#f1f5f9";
  };

  return (
    <div className="w-full overflow-x-auto" style={{ minHeight: height }}>
      <svg
        width={chartWidth}
        height={chartHeight}
        className="mx-auto"
        style={{ minWidth: chartWidth }}
      >
        {/* Y Ekseni Etiketleri */}
        {yLabels.map((label, yi) => (
          <text
            key={`y-${yi}`}
            x={labelWidth - 8}
            y={labelHeight + yi * (cellSize + cellGap) + cellSize / 2}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs"
            fill={isDark ? "#94a3b8" : "#64748b"}
          >
            {label}
          </text>
        ))}

        {/* X Ekseni Etiketleri */}
        {xLabels.map((label, xi) => (
          <text
            key={`x-${xi}`}
            x={labelWidth + xi * (cellSize + cellGap) + cellSize / 2}
            y={labelHeight - 8}
            textAnchor="middle"
            className="text-xs"
            fill={isDark ? "#94a3b8" : "#64748b"}
          >
            {label}
          </text>
        ))}

        {/* Hücre Grubu */}
        <g transform={`translate(${labelWidth}, ${labelHeight})`}>
          {matrix.map((row, yi) =>
            row.map((cell, xi) => {
              const bgColor = getColor(cell.value);
              const textColor = getTextColor(bgColor);
              
              return (
                <g key={`cell-${xi}-${yi}`}>
                  <rect
                    x={xi * (cellSize + cellGap)}
                    y={yi * (cellSize + cellGap)}
                    width={cellSize}
                    height={cellSize}
                    fill={bgColor}
                    rx={4}
                    className="transition-opacity hover:opacity-80 cursor-pointer"
                  >
                    {showTooltip && (
                      <title>
                        {cell.label || `${cell.x}, ${cell.y}: ${valueFormat(cell.value)}`}
                      </title>
                    )}
                  </rect>
                  {showValues && cellSize >= 30 && (
                    <text
                      x={xi * (cellSize + cellGap) + cellSize / 2}
                      y={yi * (cellSize + cellGap) + cellSize / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={textColor}
                      fontSize={cellSize >= 40 ? 12 : 10}
                      fontWeight={500}
                    >
                      {valueFormat(cell.value)}
                    </text>
                  )}
                </g>
              );
            })
          )}
        </g>

        {/* Renk Skalası Göstergesi */}
        <defs>
          <linearGradient id="heatmap-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.min} />
            {colors.mid && <stop offset="50%" stopColor={colors.mid} />}
            <stop offset="100%" stopColor={colors.max} />
          </linearGradient>
        </defs>
        <g transform={`translate(${labelWidth}, ${chartHeight - 20})`}>
          <rect
            x={0}
            y={0}
            width={xLabels.length * (cellSize + cellGap) - cellGap}
            height={8}
            fill="url(#heatmap-gradient)"
            rx={4}
          />
          <text
            x={0}
            y={-4}
            fill={isDark ? "#94a3b8" : "#64748b"}
            fontSize={10}
          >
            {valueFormat(minValue)}
          </text>
          <text
            x={xLabels.length * (cellSize + cellGap) - cellGap}
            y={-4}
            textAnchor="end"
            fill={isDark ? "#94a3b8" : "#64748b"}
            fontSize={10}
          >
            {valueFormat(maxValue)}
          </text>
        </g>
      </svg>
    </div>
  );
}
