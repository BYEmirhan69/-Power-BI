"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BarChart3, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Şifre en az 8 karakter olmalıdır")
      .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir")
      .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir")
      .regex(/[0-9]/, "Şifre en az bir rakam içermelidir"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const supabase = createClient();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Supabase session'ı kontrol et
  useEffect(() => {
    const checkSession = async () => {
      // URL'den hash parametrelerini al (Supabase recovery token için)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken) {
        // Recovery token ile session oluştur
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get("refresh_token") || "",
        });

        if (error) {
          console.error("Session error:", error);
          setIsValidSession(false);
          return;
        }
        setIsValidSession(true);
      } else {
        // Normal session kontrolü
        const { data: { session } } = await supabase.auth.getSession();
        setIsValidSession(!!session);
      }
    };

    checkSession();
  }, [supabase.auth]);

  async function onSubmit(data: ResetPasswordFormValues) {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error("Şifre güncellenemedi", {
          description: error.message,
        });
        return;
      }

      setIsSuccess(true);
      toast.success("Şifre güncellendi", {
        description: "Yeni şifrenizle giriş yapabilirsiniz.",
      });

      // 3 saniye sonra login sayfasına yönlendir
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch {
      toast.error("Bir hata oluştu", {
        description: "Lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Yükleniyor durumu
  if (isValidSession === null) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Doğrulanıyor...</p>
        </CardContent>
      </Card>
    );
  }

  // Geçersiz veya süresi dolmuş link
  if (!isValidSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Geçersiz veya Süresi Dolmuş Link
          </CardTitle>
          <CardDescription>
            Bu şifre sıfırlama linki geçersiz veya süresi dolmuş olabilir.
            Lütfen yeni bir şifre sıfırlama linki isteyin.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2">
          <Link href="/auth/forgot-password" className="w-full">
            <Button className="w-full">Yeni Link İste</Button>
          </Link>
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Giriş Sayfasına Dön
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  // Başarılı şifre güncelleme
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
              <CheckCircle className="h-7 w-7" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Şifre Güncellendi!
          </CardTitle>
          <CardDescription>
            Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
        <CardFooter>
          <Link href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Şimdi Giriş Yap
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="h-7 w-7" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Yeni Şifre Belirle</CardTitle>
        <CardDescription>
          Hesabınız için güçlü ve güvenli bir şifre oluşturun
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yeni Şifre</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre Tekrar</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Şifre gereksinimleri */}
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium mb-2">Şifre gereksinimleri:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className={form.watch("password")?.length >= 8 ? "text-green-600" : ""}>
                  • En az 8 karakter
                </li>
                <li className={/[A-Z]/.test(form.watch("password") || "") ? "text-green-600" : ""}>
                  • En az bir büyük harf (A-Z)
                </li>
                <li className={/[a-z]/.test(form.watch("password") || "") ? "text-green-600" : ""}>
                  • En az bir küçük harf (a-z)
                </li>
                <li className={/[0-9]/.test(form.watch("password") || "") ? "text-green-600" : ""}>
                  • En az bir rakam (0-9)
                </li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Güncelleniyor...
                </>
              ) : (
                "Şifreyi Güncelle"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <Link href="/auth/login" className="w-full">
          <Button variant="ghost" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Giriş sayfasına dön
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
