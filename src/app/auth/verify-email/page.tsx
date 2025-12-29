"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, Mail, CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";
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

// Email maskeleme fonksiyonu
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return email;

  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const maskedLocal = localPart.charAt(0) + "***";
  const maskedDomain = domainName.charAt(0) + "***";

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

type VerificationResult = "success" | "invalid" | "expired" | "already-verified" | "error" | null;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [result, setResult] = useState<VerificationResult>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // URL parametrelerini al
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const resultParam = searchParams.get("result") as VerificationResult;

  // Token varsa doğrulama API'sine yönlendir
  useEffect(() => {
    if (token && !isVerifying && !result) {
      setIsVerifying(true);
      // API route'a yönlendir - bu GET isteği yapacak ve sonucu döndürecek
      router.replace(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    }
  }, [token, router, isVerifying, result]);

  useEffect(() => {
    if (resultParam) {
      setResult(resultParam);
    }
  }, [resultParam]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // E-posta yeniden gönder
  const handleResend = useCallback(async () => {
    if (!email || isResending || cooldown > 0) return;

    setIsResending(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit
          const retryAfterSec = Math.ceil((data.retryAfterMs || 60000) / 1000);
          setCooldown(retryAfterSec);
          toast.error("Çok fazla deneme", {
            description: data.error || `${retryAfterSec} saniye bekleyin.`,
          });
        } else if (data.alreadyVerified) {
          setResult("already-verified");
          toast.info("Zaten doğrulanmış", {
            description: "Bu e-posta adresi zaten doğrulanmış.",
          });
        } else {
          toast.error("Hata", {
            description: data.error || "E-posta gönderilemedi.",
          });
        }
        return;
      }

      // Başarılı
      setCooldown(60); // 60 saniye bekleme
      toast.success("E-posta gönderildi!", {
        description: "Doğrulama linki e-posta adresinize gönderildi.",
      });
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Bir hata oluştu", {
        description: "Lütfen tekrar deneyin.",
      });
    } finally {
      setIsResending(false);
    }
  }, [email, isResending, cooldown]);

  // Token doğrulanırken loading göster (result yoksa)
  if ((isVerifying || token) && !resultParam) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Doğrulanıyor...
          </CardTitle>
          <CardDescription className="text-base">
            E-posta adresiniz doğrulanıyor, lütfen bekleyin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Sonuç bazlı içerik
  const renderContent = () => {
    switch (result) {
      case "success":
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">
                E-posta Doğrulandı! 🎉
              </CardTitle>
              <CardDescription className="text-base">
                Hesabınız başarıyla aktifleştirildi. Artık giriş yapabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2 pt-4">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full" size="lg">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Giriş Yap
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      case "invalid":
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <XCircle className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">
                Geçersiz Link
              </CardTitle>
              <CardDescription className="text-base">
                Bu doğrulama linki geçersiz veya bozuk. Lütfen yeni bir doğrulama e-postası isteyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {email && (
                <p className="text-center text-sm text-muted-foreground mb-4">
                  E-posta: <span className="font-medium">{maskEmail(email)}</span>
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {email && (
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      {cooldown} saniye bekleyin
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Yeni Link Gönder
                    </>
                  )}
                </Button>
              )}
              <Link href="/auth/login" className="w-full">
                <Button className="w-full" variant="ghost">
                  Giriş Sayfasına Git
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      case "expired":
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-orange-600">
                Linkin Süresi Doldu
              </CardTitle>
              <CardDescription className="text-base">
                Bu doğrulama linkinin süresi dolmuş. Yeni bir doğrulama e-postası isteyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {email && (
                <p className="text-center text-sm text-muted-foreground mb-4">
                  E-posta: <span className="font-medium">{maskEmail(email)}</span>
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {email && (
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      {cooldown} saniye bekleyin
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Yeni Doğrulama Linki Gönder
                    </>
                  )}
                </Button>
              )}
              <Link href="/auth/login" className="w-full">
                <Button className="w-full" variant="ghost">
                  Giriş Sayfasına Git
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      case "already-verified":
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                Zaten Doğrulanmış
              </CardTitle>
              <CardDescription className="text-base">
                Bu e-posta adresi zaten doğrulanmış. Giriş yapabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2 pt-4">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full" size="lg">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Giriş Yap
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      case "error":
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <XCircle className="h-8 w-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">
                Bir Hata Oluştu
              </CardTitle>
              <CardDescription className="text-base">
                Doğrulama işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2 pt-4">
              {email && (
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tekrar Dene
                    </>
                  )}
                </Button>
              )}
              <Link href="/auth/login" className="w-full">
                <Button className="w-full" variant="ghost">
                  Giriş Sayfasına Git
                </Button>
              </Link>
            </CardFooter>
          </>
        );

      // Varsayılan: Bekleme durumu (kayıt sonrası)
      default:
        return (
          <>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
                  <Mail className="h-7 w-7" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                E-postanızı Doğrulayın
              </CardTitle>
              <CardDescription className="text-base">
                Hesabınızı aktifleştirmek için e-posta adresinize gönderilen doğrulama
                linkine tıklayın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {email && (
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">E-posta gönderildi:</p>
                  <p className="font-medium text-lg">{maskEmail(email)}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">Sonraki adımlar:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>E-posta gelen kutunuzu kontrol edin</li>
                  <li>Spam/Junk klasörünü de kontrol edin</li>
                  <li>Doğrulama linkine tıklayın</li>
                  <li>Hesabınızla giriş yapın</li>
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Giriş Sayfasına Git
                </Button>
              </Link>
              {email && (
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldown > 0}
                  variant="outline"
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gönderiliyor...
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      {cooldown} saniye bekleyin
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tekrar Gönder
                    </>
                  )}
                </Button>
              )}
              {!email && (
                <p className="text-center text-sm text-muted-foreground">
                  E-posta almadınız mı?{" "}
                  <Link
                    href="/auth/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Tekrar deneyin
                  </Link>
                </p>
              )}
            </CardFooter>
          </>
        );
    }
  };

  return (
    <Card className="w-full max-w-md">
      {renderContent()}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
