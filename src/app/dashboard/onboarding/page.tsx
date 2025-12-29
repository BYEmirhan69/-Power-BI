"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Rocket, Users, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";

const organizationSchema = z.object({
  name: z
    .string()
    .min(2, "Organizasyon adı en az 2 karakter olmalı")
    .max(100, "Organizasyon adı en fazla 100 karakter olabilir"),
});

type OrganizationFormValues = z.infer<typeof organizationSchema>;

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(data: OrganizationFormValues) {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error("Organizasyon oluşturulamadı", {
          description: result.error || "Bir hata oluştu",
        });
        return;
      }

      toast.success("Organizasyon oluşturuldu!", {
        description: `${data.name} başarıyla oluşturuldu.`,
      });

      // Profili yenile ve dashboard'a yönlendir
      await refreshProfile();
      router.push("/dashboard");
    } catch (error) {
      console.error("Organizasyon oluşturma hatası:", error);
      toast.error("Bir hata oluştu", {
        description: "Lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Rocket className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hoş Geldiniz, {user?.user_metadata?.full_name || "Kullanıcı"}!
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Platformu kullanmaya başlamak için organizasyonunuzu oluşturun
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Güçlü Grafikler</p>
                  <p className="text-sm text-muted-foreground">
                    Verilerinizi görselleştirin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Takım Çalışması</p>
                  <p className="text-sm text-muted-foreground">
                    Ekibinizi davet edin
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Güvenli Altyapı</p>
                  <p className="text-sm text-muted-foreground">
                    Verileriniz güvende
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Form */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl">Organizasyon Oluştur</CardTitle>
            <CardDescription>
              Şirketiniz, ekibiniz veya projeniz için bir isim belirleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizasyon Adı</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Örn: Acme Teknoloji, Pazarlama Ekibi..."
                          className="h-12 text-lg"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Bu ismi daha sonra değiştirebilirsiniz
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5 mr-2" />
                      Başlayalım
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Yardıma mı ihtiyacınız var?{" "}
          <a href="mailto:support@powerbi.com" className="text-primary hover:underline">
            Destek ekibimizle iletişime geçin
          </a>
        </p>
      </div>
    </div>
  );
}
