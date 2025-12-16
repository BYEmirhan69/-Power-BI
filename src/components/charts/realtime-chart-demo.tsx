/**
 * Supabase Realtime Charts Demo Sayfası
 * Hook ve bileşenlerin birlikte çalıştığını gösteren örnek
 */

"use client";

import { useMemo } from "react";
import { useSupabaseChart, type ChartData } from "@/hooks/use-supabase-chart";
import {
  SupabaseBarChart,
  SupabaseLineChart,
  SupabasePieChart,
} from "@/components/charts/supabase-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, RefreshCw as _RefreshCw } from "lucide-react";
import { Button as _Button } from "@/components/ui/button";

// Varsayılan renkler
const DEFAULT_COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(16, 185, 129, 0.8)",
  "rgba(245, 158, 11, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(139, 92, 246, 0.8)",
  "rgba(236, 72, 153, 0.8)",
  "rgba(6, 182, 212, 0.8)",
  "rgba(249, 115, 22, 0.8)",
];

const DEFAULT_BORDER_COLORS = [
  "rgba(59, 130, 246, 1)",
  "rgba(16, 185, 129, 1)",
  "rgba(245, 158, 11, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(139, 92, 246, 1)",
  "rgba(236, 72, 153, 1)",
  "rgba(6, 182, 212, 1)",
  "rgba(249, 115, 22, 1)",
];

// ============================================
// Örnek 1: Basit Bar Chart (Dashboard verisi)
// ============================================
function DashboardViewsChart() {
  const { chartData, loading, error, refresh, lastUpdated } = useSupabaseChart({
    table: "dashboards",
    labelColumn: "name",
    valueColumns: "view_count",
    datasetLabels: ["Görüntülenme"],
    orderBy: { column: "view_count", ascending: false },
    limit: 5,
    realtime: true,
  });

  return (
    <SupabaseBarChart
      title="En Popüler Dashboardlar"
      description="En çok görüntülenen 5 dashboard"
      data={chartData}
      loading={loading}
      error={error}
      onRefresh={refresh}
      lastUpdated={lastUpdated}
      height={350}
      horizontal
    />
  );
}

// ============================================
// Örnek 2: Line Chart (Chart verisi)
// ============================================
function ChartsOverTimeChart() {
  const { chartData, loading, error, refresh, lastUpdated } = useSupabaseChart({
    table: "charts",
    labelColumn: "created_at",
    valueColumns: "id",
    datasetLabels: ["Grafik Sayısı"],
    orderBy: { column: "created_at", ascending: true },
    limit: 30,
    realtime: true,
  });

  return (
    <SupabaseLineChart
      title="Grafik Oluşturma Trendi"
      description="Son 30 kaydın zaman çizelgesi"
      data={chartData}
      loading={loading}
      error={error}
      onRefresh={refresh}
      lastUpdated={lastUpdated}
      height={350}
      smooth
      fill
    />
  );
}

// ============================================
// Örnek 3: Pie Chart (Statik veri demo)
// ============================================
function ChartTypesDistribution() {
  // Bu örnek statik veri kullanıyor - gerçek uygulamada Supabase'den çekilir
  const staticData: ChartData = useMemo(() => ({
    labels: ["Bar Chart", "Line Chart", "Pie Chart", "Area Chart", "Radar Chart"],
    datasets: [
      {
        label: "Grafik Tipleri",
        data: [35, 28, 18, 12, 7],
        backgroundColor: DEFAULT_COLORS.slice(0, 5),
        borderColor: DEFAULT_BORDER_COLORS.slice(0, 5),
        borderWidth: 2,
      },
    ],
  }), []);

  return (
    <SupabasePieChart
      title="Grafik Tipi Dağılımı"
      description="Kullanılan grafik tiplerinin oranı"
      data={staticData}
      height={300}
    />
  );
}

// ============================================
// Örnek 4: Kullanıcı Aktivitesi
// ============================================
function UserActivityChart() {
  const { chartData, loading, error, refresh, lastUpdated } = useSupabaseChart({
    table: "profiles",
    labelColumn: "full_name",
    valueColumns: "id",
    datasetLabels: ["Kullanıcı"],
    orderBy: { column: "created_at", ascending: false },
    limit: 10,
    realtime: true,
  });

  return (
    <SupabaseBarChart
      title="Son Kayıt Olan Kullanıcılar"
      description="En son 10 kullanıcı"
      data={chartData}
      loading={loading}
      error={error}
      onRefresh={refresh}
      lastUpdated={lastUpdated}
      height={300}
    />
  );
}

// ============================================
// Örnek 5: KPI Kartları (rawData kullanarak)
// ============================================
interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  unit?: string;
  loading?: boolean;
}

function KPICard({ title, value, previousValue, unit, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-6">
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-8 bg-muted rounded w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const change = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trend = change > 1 ? "up" : change < -1 ? "down" : "stable";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">
          {value.toLocaleString("tr-TR")}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {trend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
          {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
          <Badge
            variant={trend === "up" ? "default" : trend === "down" ? "destructive" : "secondary"}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(1)}%
          </Badge>
          <span className="text-xs text-muted-foreground">önceki döneme göre</span>
        </div>
      </CardContent>
    </Card>
  );
}

function KPISection() {
  const { rawData: dashboardData, loading: dashboardLoading } = useSupabaseChart({
    table: "dashboards",
    labelColumn: "id",
    valueColumns: "id",
    realtime: true,
  });

  const { rawData: chartData, loading: chartLoading } = useSupabaseChart({
    table: "charts",
    labelColumn: "id",
    valueColumns: "id",
    realtime: true,
  });

  const { rawData: profileData, loading: profileLoading } = useSupabaseChart({
    table: "profiles",
    labelColumn: "id",
    valueColumns: "id",
    realtime: true,
  });

  const { rawData: reportData, loading: reportLoading } = useSupabaseChart({
    table: "reports",
    labelColumn: "id",
    valueColumns: "id",
    realtime: true,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Toplam Dashboard"
        value={dashboardData.length}
        previousValue={dashboardData.length > 0 ? dashboardData.length - 2 : 0}
        loading={dashboardLoading}
      />
      <KPICard
        title="Toplam Grafik"
        value={chartData.length}
        previousValue={chartData.length > 0 ? chartData.length - 5 : 0}
        loading={chartLoading}
      />
      <KPICard
        title="Toplam Kullanıcı"
        value={profileData.length}
        previousValue={profileData.length > 0 ? profileData.length - 1 : 0}
        loading={profileLoading}
      />
      <KPICard
        title="Toplam Rapor"
        value={reportData.length}
        previousValue={reportData.length > 0 ? reportData.length - 3 : 0}
        loading={reportLoading}
      />
    </div>
  );
}

// ============================================
// Ana Demo Bileşeni
// ============================================
export function RealtimeChartDemo() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Realtime Dashboard</h2>
          <p className="text-muted-foreground">
            Supabase Realtime ile canlı güncellenen grafikler
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          Canlı
        </Badge>
      </div>

      {/* KPI Row */}
      <KPISection />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardViewsChart />
        <ChartsOverTimeChart />
        <ChartTypesDistribution />
        <UserActivityChart />
      </div>
    </div>
  );
}

// Named exports for individual usage
export {
  DashboardViewsChart,
  ChartsOverTimeChart,
  ChartTypesDistribution,
  UserActivityChart,
  KPISection,
  KPICard,
};
