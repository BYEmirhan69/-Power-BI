"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
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

interface AreaConfig {
  dataKey: string;
  name?: string;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
}

interface DynamicAreaChartProps {
  data: DataPoint[];
  xAxisKey: string;
  areas: AreaConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  gradientFill?: boolean;
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

export function DynamicAreaChart({
  data,
  xAxisKey,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  gradientFill = true,
}: DynamicAreaChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const axisStyle = {
    fontSize: 12,
    fill: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          {areas.map((area, index) => {
            const color = area.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            return (
              <linearGradient
                key={`gradient-${area.dataKey}`}
                id={`gradient-${area.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>
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
        {areas.map((area, index) => {
          const color = area.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name || area.dataKey}
              stroke={color}
              strokeWidth={2}
              fill={gradientFill ? `url(#gradient-${area.dataKey})` : color}
              fillOpacity={area.fillOpacity || (gradientFill ? 1 : 0.3)}
              stackId={area.stackId}
            />
          );
        })}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
