"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTheme } from "next-themes";

interface DataPoint {
  [key: string]: string | number;
}

interface BarConfig {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
}

interface DynamicBarChartProps {
  data: DataPoint[];
  xAxisKey: string;
  bars: BarConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  layout?: "horizontal" | "vertical";
  colorByValue?: boolean;
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

export function DynamicBarChart({
  data,
  xAxisKey,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  layout = "horizontal",
  colorByValue = false,
}: DynamicBarChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const axisStyle = {
    fontSize: 12,
    fill: isDark ? "#94a3b8" : "#64748b",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#334155" : "#e2e8f0"}
          />
        )}
        {layout === "horizontal" ? (
          <>
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
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={axisStyle}
              axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
              tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
            />
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tick={axisStyle}
              axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
              tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
              width={100}
            />
          </>
        )}
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#ffffff",
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
            cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
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
        {bars.map((bar, barIndex) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name || bar.dataKey}
            fill={bar.color || DEFAULT_COLORS[barIndex % DEFAULT_COLORS.length]}
            stackId={bar.stackId}
            radius={[4, 4, 0, 0]}
          >
            {colorByValue &&
              data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
