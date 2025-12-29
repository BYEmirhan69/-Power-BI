"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users } from "lucide-react";
import { ChartContainer } from "@/components/charts";

// Lazy load chart components for better performance
const DynamicLineChart = dynamic(
  () => import("@/components/charts/line-chart").then((mod) => ({ default: mod.DynamicLineChart })),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />
  }
);

const DynamicBarChart = dynamic(
  () => import("@/components/charts/bar-chart").then((mod) => ({ default: mod.DynamicBarChart })),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />
  }
);

const DynamicPieChart = dynamic(
  () => import("@/components/charts/pie-chart").then((mod) => ({ default: mod.DynamicPieChart })),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />
  }
);

const DynamicAreaChart = dynamic(
  () => import("@/components/charts/area-chart").then((mod) => ({ default: mod.DynamicAreaChart })),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />
  }
);

// Örnek veriler - Gerçek uygulamada API'den gelecek
const monthlyData = [
  { month: "Oca", gelir: 4000, gider: 2400, kar: 1600 },
  { month: "Şub", gelir: 3000, gider: 1398, kar: 1602 },
  { month: "Mar", gelir: 2000, gider: 9800, kar: -7800 },
  { month: "Nis", gelir: 2780, gider: 3908, kar: -1128 },
  { month: "May", gelir: 1890, gider: 4800, kar: -2910 },
  { month: "Haz", gelir: 2390, gider: 3800, kar: -1410 },
  { month: "Tem", gelir: 3490, gider: 4300, kar: -810 },
  { month: "Ağu", gelir: 4200, gider: 2100, kar: 2100 },
  { month: "Eyl", gelir: 5100, gider: 2900, kar: 2200 },
  { month: "Eki", gelir: 4800, gider: 2500, kar: 2300 },
  { month: "Kas", gelir: 5500, gider: 3100, kar: 2400 },
  { month: "Ara", gelir: 6200, gider: 3400, kar: 2800 },
];

const categoryData = [
  { name: "Elektronik", value: 4000 },
  { name: "Giyim", value: 3000 },
  { name: "Gıda", value: 2000 },
  { name: "Mobilya", value: 2780 },
  { name: "Diğer", value: 1890 },
];

const weeklyTraffic = [
  { day: "Pzt", ziyaretci: 1200, sayfa: 3400 },
  { day: "Sal", ziyaretci: 1400, sayfa: 4200 },
  { day: "Çar", ziyaretci: 1100, sayfa: 3100 },
  { day: "Per", ziyaretci: 1600, sayfa: 4800 },
  { day: "Cum", ziyaretci: 1800, sayfa: 5200 },
  { day: "Cmt", ziyaretci: 900, sayfa: 2400 },
  { day: "Paz", ziyaretci: 700, sayfa: 1800 },
];

const recentActivity = [
  {
    user: "Ahmet Yılmaz",
    action: "yeni bir dashboard oluşturdu",
    target: "Satış Analizi 2024",
    time: "2 dakika önce",
  },
  {
    user: "Ayşe Demir",
    action: "veri seti güncelledi",
    target: "Müşteri Verileri",
    time: "15 dakika önce",
  },
  {
    user: "Mehmet Kaya",
    action: "grafik ekledi",
    target: "Aylık Gelir Trendi",
    time: "1 saat önce",
  },
  {
    user: "Zeynep Öz",
    action: "rapor dışa aktardı",
    target: "Q3 Finansal Rapor",
    time: "2 saat önce",
  },
];

export function DashboardCharts() {
  return (
    <div className="space-y-6">
      {/* Ana Grafikler Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Gelir/Gider Trend Grafiği */}
        <ChartContainer
          title="Gelir & Gider Trendi"
          description="Son 12 aylık finansal veriler"
          className="col-span-4"
        >
          <DynamicAreaChart
            data={monthlyData}
            xAxisKey="month"
            areas={[
              { dataKey: "gelir", name: "Gelir", color: "#10b981" },
              { dataKey: "gider", name: "Gider", color: "#ef4444" },
            ]}
            height={300}
          />
        </ChartContainer>

        {/* Son Aktiviteler */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Son Aktiviteler
            </CardTitle>
            <CardDescription>Platform üzerindeki son işlemler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      <span className="font-semibold">{activity.user}</span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-sm text-primary">{activity.target}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* İkinci Satır Grafikler */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Kategori Dağılımı - Pasta Grafik */}
        <ChartContainer
          title="Kategori Dağılımı"
          description="Ürün kategorilerine göre satış"
        >
          <DynamicPieChart
            data={categoryData}
            height={280}
            innerRadius={50}
            outerRadius={90}
            labelType="percent"
          />
        </ChartContainer>

        {/* Haftalık Trafik - Çubuk Grafik */}
        <ChartContainer
          title="Haftalık Trafik"
          description="Ziyaretçi ve sayfa görüntüleme"
        >
          <DynamicBarChart
            data={weeklyTraffic}
            xAxisKey="day"
            bars={[
              { dataKey: "ziyaretci", name: "Ziyaretçi", color: "#3b82f6" },
              { dataKey: "sayfa", name: "Sayfa Görüntüleme", color: "#8b5cf6" },
            ]}
            height={280}
          />
        </ChartContainer>

        {/* Aylık Kar - Çizgi Grafik */}
        <ChartContainer
          title="Aylık Kar Trendi"
          description="Net kar değişimi"
        >
          <DynamicLineChart
            data={monthlyData}
            xAxisKey="month"
            lines={[
              { dataKey: "kar", name: "Net Kar", color: "#f59e0b" },
            ]}
            height={280}
          />
        </ChartContainer>
      </div>
    </div>
  );
}
