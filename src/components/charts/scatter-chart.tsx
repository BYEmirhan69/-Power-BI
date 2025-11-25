"use client";

import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import { useTheme } from "next-themes";

interface ScatterDataPoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
  [key: string]: string | number | undefined;
}

interface ScatterConfig {
  name: string;
  data: ScatterDataPoint[];
  color?: string;
}

interface DynamicScatterChartProps {
  scatters: ScatterConfig[];
  xAxisName?: string;
  yAxisName?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showZAxis?: boolean;
  zRange?: [number, number];
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

export function DynamicScatterChart({
  scatters,
  xAxisName = "X",
  yAxisName = "Y",
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  showZAxis = false,
  zRange = [50, 400],
}: DynamicScatterChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const axisStyle = {
    fontSize: 12,
    fill: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#334155" : "#e2e8f0"}
          />
        )}
        <XAxis
          type="number"
          dataKey="x"
          name={xAxisName}
          tick={axisStyle}
          axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          label={{
            value: xAxisName,
            position: "insideBottom",
            offset: -5,
            style: { fill: isDark ? "#94a3b8" : "#64748b" },
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yAxisName}
          tick={axisStyle}
          axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          label={{
            value: yAxisName,
            angle: -90,
            position: "insideLeft",
            style: { fill: isDark ? "#94a3b8" : "#64748b" },
          }}
        />
        {showZAxis && <ZAxis type="number" dataKey="z" range={zRange} />}
        {showTooltip && (
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            formatter={(value: number, name: string) => [value, name]}
          />
        )}
        {showLegend && (
          <Legend
            formatter={(value) => (
              <span style={{ color: isDark ? "#e2e8f0" : "#334155" }}>{value}</span>
            )}
          />
        )}
        {scatters.map((scatter, index) => (
          <Scatter
            key={scatter.name}
            name={scatter.name}
            data={scatter.data}
            fill={scatter.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
          />
        ))}
      </RechartsScatterChart>
    </ResponsiveContainer>
  );
}
