"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
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
  Sparkles,
  DollarSign,
  Mail,
  Phone,
  MapPin,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThemeProvider } from "@/components/providers";
import { ThemeToggle } from "@/components/layout";

const Hyperspeed = dynamic(() => import("@/components/backgrounds/hyperspeed"), {
  ssr: false,
});

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
      <div className="min-h-screen bg-background relative">
        {/* Hyperspeed Background */}
        <div className="fixed inset-0 z-0">
          <Hyperspeed
            effectOptions={{
              distortion: "turbulentDistortion",
              length: 400,
              roadWidth: 10,
              islandWidth: 2,
              lanesPerRoad: 4,
              fov: 90,
              fovSpeedUp: 150,
              speedUp: 2,
              carLightsFade: 0.4,
              totalSideLightSticks: 20,
              lightPairsPerRoadWay: 40,
              shoulderLinesWidthPercentage: 0.05,
              brokenLinesWidthPercentage: 0.1,
              brokenLinesLengthPercentage: 0.5,
              lightStickWidth: [0.12, 0.5],
              lightStickHeight: [1.3, 1.7],
              movingAwaySpeed: [60, 80],
              movingCloserSpeed: [-120, -160],
              carLightsLength: [400 * 0.03, 400 * 0.2],
              carLightsRadius: [0.05, 0.14],
              carWidthPercentage: [0.3, 0.5],
              carShiftX: [-0.8, 0.8],
              carFloorSeparation: [0, 5],
              colors: {
                roadColor: 0x080808,
                islandColor: 0x0a0a0a,
                background: 0x000000,
                shoulderLines: 0xffffff,
                brokenLines: 0xffffff,
                leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
                rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
                sticks: 0x03b3c3,
              },
            }}
          />
        </div>

        {/* Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Tüm Özellikler
              </Link>
              <Link
                href="#pricing"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Fiyatlar
              </Link>
              <Link
                href="#contact"
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                İletişim
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost">Giriş Yap</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Kayıt Ol</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container py-24 md:py-32 relative z-10">
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
        <section className="border-y bg-muted/80 backdrop-blur relative z-10">
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
        <section id="features" className="container py-24 relative z-10 bg-background/80 backdrop-blur">
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
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-2 hover:scale-[1.02] group"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors duration-300">{feature.title}</CardTitle>
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
        <section className="border-t bg-muted/80 backdrop-blur relative z-10">
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

        {/* Contact Section */}
        <section id="contact" className="container py-24 relative z-10 bg-background/80 backdrop-blur">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              İletişim
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sorularınız mı var? Bizimle iletişime geçin, size yardımcı olmaktan mutluluk duyarız.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">E-posta</h3>
                  <p className="text-muted-foreground">destek@powerbi-platform.com</p>
                  <p className="text-muted-foreground">satis@powerbi-platform.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Telefon</h3>
                  <p className="text-muted-foreground">+90 (212) 555 0123</p>
                  <p className="text-muted-foreground">+90 (532) 555 0456</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Adres</h3>
                  <p className="text-muted-foreground">Levent Mahallesi, Büyükdere Caddesi</p>
                  <p className="text-muted-foreground">No: 123, 34394 Şişli/İstanbul</p>
                </div>
              </div>
            </div>
            {/* Contact Form */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Bize Mesaj Gönderin</CardTitle>
                <CardDescription>
                  Formu doldurun, en kısa sürede size dönüş yapalım.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Ad Soyad
                    </label>
                    <Input id="name" placeholder="Adınız Soyadınız" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      E-posta
                    </label>
                    <Input id="email" type="email" placeholder="ornek@email.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">
                    Konu
                  </label>
                  <Input id="subject" placeholder="Mesajınızın konusu" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Mesaj
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Mesajınızı buraya yazın..."
                    className="min-h-[120px]"
                  />
                </div>
                <Button className="w-full gap-2">
                  <Send className="h-4 w-4" />
                  Mesaj Gönder
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t relative z-10 bg-background/80 backdrop-blur">
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
