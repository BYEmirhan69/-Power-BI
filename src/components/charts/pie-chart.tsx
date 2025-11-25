"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";

interface DataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

interface DynamicPieChartProps {
  data: DataPoint[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showLabels?: boolean;
  labelType?: "name" | "value" | "percent" | "namePercent";
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

const RADIAN = Math.PI / 180;

export function DynamicPieChart({
  data,
  height = 300,
  innerRadius = 0,
  outerRadius = 100,
  showLegend = true,
  showTooltip = true,
  showLabels = true,
  labelType = "percent",
}: DynamicPieChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderCustomizedLabel = (props: any) => {
    const {
      cx,
      cy,
      midAngle,
      innerRadius: ir,
      outerRadius: or,
      percent,
      name,
      value,
    } = props;

    const radius = ir + (or - ir) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    let labelText = "";
    switch (labelType) {
      case "name":
        labelText = name;
        break;
      case "value":
        labelText = value.toString();
        break;
      case "percent":
        labelText = `${(percent * 100).toFixed(0)}%`;
        break;
      case "namePercent":
        labelText = `${name}: ${(percent * 100).toFixed(0)}%`;
        break;
    }

    return (
      <text
        x={x}
        y={y}
        fill={isDark ? "#f1f5f9" : "#ffffff"}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {labelText}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? renderCustomizedLabel : undefined}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              stroke={isDark ? "#1e293b" : "#ffffff"}
              strokeWidth={2}
            />
          ))}
        </Pie>
        {showTooltip && (
          <Tooltip
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
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
