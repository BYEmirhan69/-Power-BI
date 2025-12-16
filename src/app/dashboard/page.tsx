import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  Database,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";
import { DashboardCharts } from "./dashboard-charts";

const stats = [
  {
    title: "Toplam Dashboard",
    value: "12",
    description: "+2 bu ay",
    icon: BarChart3,
    trend: "up",
  },
  {
    title: "Veri Setleri",
    value: "45",
    description: "8 aktif kaynak",
    icon: FileSpreadsheet,
    trend: "up",
  },
  {
    title: "Grafikler",
    value: "89",
    description: "+12 bu hafta",
    icon: TrendingUp,
    trend: "up",
  },
  {
    title: "Veri Kaynağı",
    value: "6",
    description: "Tümü aktif",
    icon: Database,
    trend: "stable",
  },
];

const _recentActivity = [
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          İş zekası platformunuza hoş geldiniz. Verilerinizi görselleştirin ve analiz edin.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <DashboardCharts />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı Erişim</CardTitle>
          <CardDescription>
            Sık kullanılan işlemlere hızlıca erişin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Yeni Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Dashboard oluştur
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Veri Yükle</p>
                <p className="text-sm text-muted-foreground">
                  CSV/Excel aktar
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Database className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Veri Kaynağı</p>
                <p className="text-sm text-muted-foreground">
                  API bağlantısı
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Rapor Oluştur</p>
                <p className="text-sm text-muted-foreground">
                  PDF/Excel çıktı
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
