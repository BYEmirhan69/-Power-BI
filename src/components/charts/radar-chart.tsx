"use client";

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";

interface RadarDataPoint {
  subject: string;
  [key: string]: string | number;
}

interface RadarConfig {
  dataKey: string;
  name?: string;
  color?: string;
  fillOpacity?: number;
}

interface DynamicRadarChartProps {
  data: RadarDataPoint[];
  radars: RadarConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  gridType?: "polygon" | "circle";
  angleAxisKey?: string;
  domain?: [number, number];
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function DynamicRadarChart({
  data,
  radars,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  gridType = "polygon",
  angleAxisKey = "subject",
  domain,
}: DynamicRadarChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const axisStyle = {
    fontSize: 12,
    fill: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        {showGrid && (
          <PolarGrid
            stroke={isDark ? "#334155" : "#e2e8f0"}
            gridType={gridType}
          />
        )}
        <PolarAngleAxis
          dataKey={angleAxisKey}
          tick={axisStyle}
          stroke={isDark ? "#475569" : "#cbd5e1"}
        />
        <PolarRadiusAxis
          angle={90}
          domain={domain}
          tick={axisStyle}
          stroke={isDark ? "#475569" : "#cbd5e1"}
          axisLine={false}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
          />
        )}
        {showLegend && (
          <Legend
            formatter={(value) => (
              <span style={{ color: isDark ? "#e2e8f0" : "#334155" }}>{value}</span>
            )}
          />
        )}
        {radars.map((radar, index) => {
          const color = radar.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <Radar
              key={radar.dataKey}
              name={radar.name || radar.dataKey}
              dataKey={radar.dataKey}
              stroke={color}
              fill={color}
              fillOpacity={radar.fillOpacity ?? 0.3}
              strokeWidth={2}
            />
          );
        })}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
