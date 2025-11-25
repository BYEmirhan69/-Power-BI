"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";

interface DataPoint {
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  name?: string;
  color?: string;
  strokeWidth?: number;
  dot?: boolean;
}

interface DynamicLineChartProps {
  data: DataPoint[];
  xAxisKey: string;
  lines: LineConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
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

export function DynamicLineChart({
  data,
  xAxisKey,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
}: DynamicLineChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const axisStyle = {
    fontSize: 12,
    fill: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#334155" : "#e2e8f0"}
          />
        )}
        <XAxis
          dataKey={xAxisKey}
          tick={axisStyle}
          axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
        />
        <YAxis
          tick={axisStyle}
          axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
          tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
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
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => (
              <span style={{ color: isDark ? "#e2e8f0" : "#334155" }}>{value}</span>
            )}
          />
        )}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name || line.dataKey}
            stroke={line.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            strokeWidth={line.strokeWidth || 2}
            dot={line.dot !== false}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
