import Link from "next/link";
import {
  BarChart3,
  Database,
  FileSpreadsheet,
  LineChart,
  PieChart,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeProvider } from "@/components/providers";
import { ThemeToggle } from "@/components/layout";

const features = [
  {
    icon: LineChart,
    title: "Zaman Serisi Analizi",
    description:
      "Trend analizi ve tahminleme ile verilerinizi zaman boyutunda görselleştirin.",
  },
  {
    icon: PieChart,
    title: "Çoklu Grafik Türleri",
    description:
      "Çizgi, çubuk, pasta, alan, scatter ve radar grafikleri ile verilerinizi sunun.",
  },
  {
    icon: Database,
    title: "Çoklu Veri Kaynağı",
    description:
      "API, CSV, Excel ve web scraping ile farklı kaynaklardan veri toplayın.",
  },
  {
    icon: Zap,
    title: "Gerçek Zamanlı Güncelleme",
    description:
      "Otomatik senkronizasyon ile verilerinizi her zaman güncel tutun.",
  },
  {
    icon: Shield,
    title: "Güvenli Altyapı",
    description:
      "Rol tabanlı erişim kontrolü ve şifreli veri aktarımı ile güvenlik.",
  },
  {
    icon: FileSpreadsheet,
    title: "Kolay Raporlama",
    description: "PDF ve Excel formatında raporlar oluşturun ve paylaşın.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime Garantisi" },
  { value: "50ms", label: "Ortalama Yanıt Süresi" },
  { value: "256-bit", label: "SSL Şifreleme" },
  { value: "7/24", label: "Teknik Destek" },
];

export default function HomePage() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl">Power BI Platform</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Özellikler
              </Link>
              <Link
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Fiyatlandırma
              </Link>
              <Link
                href="#contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                İletişim
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost">Giriş Yap</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Başla</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container py-24 md:py-32">
          <div className="flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium">
              <span className="mr-2">🚀</span>
              <span>Yeni versiyon yayında!</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
              Verilerinizi{" "}
              <span className="text-primary">Güce Dönüştürün</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Firmaların kendi veri kaynaklarını kullanarak zaman serisi,
              tüketici davranışları ve teknoloji kullanımı gibi verileri
              görselleştirebilecekleri modüler ve ölçeklenebilir iş zekası
              platformu.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2">
                  Ücretsiz Deneyin
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  Demo İncele
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>14 gün ücretsiz deneme</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Kredi kartı gerektirmez</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>İstediğiniz zaman iptal</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y bg-muted/50">
          <div className="container py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Güçlü Özellikler
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              İş zekası platformumuz, verilerinizi anlamlı içgörülere
              dönüştürmeniz için ihtiyacınız olan tüm araçları sunar.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-2 hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-muted/50">
          <div className="container py-24">
            <div className="flex flex-col items-center text-center gap-6">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Hemen Başlayın
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Verilerinizi görselleştirmeye ve iş kararlarınızı
                güçlendirmeye bugün başlayın.
              </p>
              <Link href="/auth/register">
                <Button size="lg" className="gap-2">
                  Ücretsiz Hesap Oluştur
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="container py-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span className="font-semibold">Power BI Platform</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 Power BI Platform. Tüm hakları saklıdır.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
