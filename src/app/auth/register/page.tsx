"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BarChart3, Loader2 } from "lucide-react";
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

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const supabase = createClient();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    // Duplikasyon önleme - zaten submit ediliyorsa çık
    if (isSubmittingRef.current || isLoading) {
      return;
    }
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      // 1. Supabase ile kullanıcı oluştur (email confirmation kapalı)
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (error) {
        toast.error("Kayıt başarısız", {
          description: error.message,
        });
        return;
      }

      if (!signUpData.user) {
        toast.error("Kayıt başarısız", {
          description: "Kullanıcı oluşturulamadı",
        });
        return;
      }

      // 2. Kendi doğrulama e-postamızı gönder
      const verificationResponse = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          userId: signUpData.user.id,
          fullName: data.fullName,
        }),
      });

      // Response body'yi parse et
      const responseData = await verificationResponse.json().catch(() => ({}));
      
      if (!verificationResponse.ok || !responseData.success) {
        // Resend test modu kontrolü - bu beklenen bir durum
        if (responseData.code === "RESEND_TEST_MODE") {
          toast.info("Kayıt başarılı!", {
            description: "E-posta servisi test modunda. Hesabınız oluşturuldu, doğrulama için yöneticiyle iletişime geçin.",
          });
        } else if (responseData.error) {
          // Beklenmedik hatalar için error logla
          console.error("Verification email error:", responseData.error);
          toast.warning("Kayıt başarılı!", {
            description: "E-posta gönderilemedi. Verify sayfasından tekrar deneyebilirsiniz.",
          });
        } else {
          // Bilinmeyen hata
          toast.warning("Kayıt başarılı!", {
            description: "E-posta gönderilemedi. Verify sayfasından tekrar deneyebilirsiniz.",
          });
        }
      } else {
        toast.success("Kayıt başarılı!", {
          description: "E-posta adresinize doğrulama linki gönderildi.",
        });
      }

      // 3. Verify-email sayfasına yönlendir (email parametresi ile)
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch {
      toast.error("Bir hata oluştu", {
        description: "Lütfen tekrar deneyin",
      });
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="h-7 w-7" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Hesap Oluştur</CardTitle>
        <CardDescription>
          İş zekası platformuna katılmak için kayıt olun
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad Soyad</FormLabel>
                  <FormControl>
                    <Input placeholder="Ahmet Yılmaz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-posta</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="ornek@firma.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şifre</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
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
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-sm text-muted-foreground">
          Zaten hesabınız var mı?{" "}
          <Link
            href="/auth/login"
            className="text-primary hover:underline font-medium"
          >
            Giriş yapın
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
