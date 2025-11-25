"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  UserPlus,
  ArrowRight,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types/database.types";

const roleLabels: Record<UserRole, string> = {
  admin: "Yönetici",
  user: "Kullanıcı",
  developer: "Geliştirici",
};

interface InvitationPreview {
  email: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invitedBy: {
    name: string | null;
    email: string;
  };
  expiresAt: string;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Davet bilgilerini ve kullanıcı oturumunu kontrol et
  useEffect(() => {
    async function checkInvitation() {
      if (!token) {
        setError("Geçersiz davet linki. Token bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        // Kullanıcı oturumunu kontrol et
        const { data: { user } } = await supabase.auth.getUser();
        setIsLoggedIn(!!user);
        setUserEmail(user?.email || null);

        // Davet bilgilerini getir
        const response = await fetch(`/api/invitations/accept?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setInvitation(data);
          
          // Kullanıcı giriş yapmışsa, e-posta eşleşiyor mu kontrol et
          if (user && user.email !== data.email) {
            setError(
              `Bu davet ${data.email} adresine gönderilmiş. Lütfen bu e-posta ile giriş yapın veya önce çıkış yapın.`
            );
          }
        } else {
          setError(data.error || "Davet bulunamadı veya süresi dolmuş.");
        }
      } catch (err) {
        console.error("Davet kontrol hatası:", err);
        setError("Davet kontrol edilirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    checkInvitation();
  }, [token, supabase.auth]);

  // Daveti kabul et
  const handleAccept = async () => {
    if (!token || !invitation) return;

    setAccepting(true);

    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Başarılı", {
          description: `${invitation.organization.name} organizasyonuna katıldınız!`,
        });
        
        // 2 saniye sonra dashboard'a yönlendir
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Davet kabul edilirken bir hata oluştu.");
      }
    } catch (err) {
      console.error("Davet kabul hatası:", err);
      setError("Davet kabul edilirken bir hata oluştu.");
    } finally {
      setAccepting(false);
    }
  };

  // Giriş sayfasına yönlendir
  const handleLogin = () => {
    // Token'ı session storage'a kaydet, giriş sonrası tekrar kullanılabilsin
    if (token) {
      sessionStorage.setItem("pendingInviteToken", token);
    }
    router.push(`/auth/login?redirect=/auth/accept-invite?token=${token}`);
  };

  // Kayıt sayfasına yönlendir
  const handleRegister = () => {
    if (token) {
      sessionStorage.setItem("pendingInviteToken", token);
    }
    router.push(`/auth/register?email=${encodeURIComponent(invitation?.email || "")}&redirect=/auth/accept-invite?token=${token}`);
  };

  // Yükleniyor
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Davet kontrol ediliyor...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Davet Geçersiz</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild>
              <Link href="/auth/login">Giriş Sayfasına Git</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Başarılı kabul
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Hoş Geldiniz!</CardTitle>
            <CardDescription>
              {invitation?.organization.name} organizasyonuna başarıyla katıldınız.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Yönlendiriliyorsunuz...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Davet önizleme
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Organizasyon Daveti</CardTitle>
          <CardDescription>
            Bir organizasyona katılmaya davet edildiniz.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Organizasyon Bilgisi */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{invitation?.organization.name}</p>
                <p className="text-sm text-muted-foreground">Organizasyon</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Rol</span>
              <Badge variant="secondary">
                {roleLabels[invitation?.role || "user"]}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Davet Eden</span>
              <span className="text-sm">
                {invitation?.invitedBy.name || invitation?.invitedBy.email}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">E-posta</span>
              <span className="text-sm font-mono">{invitation?.email}</span>
            </div>
          </div>

          {/* Kullanıcı Durumu */}
          {isLoggedIn ? (
            userEmail === invitation?.email ? (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  <strong>{userEmail}</strong> olarak giriş yapılmış.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Farklı bir hesapla giriş yapmışsınız ({userEmail}).
                  Bu davet <strong>{invitation?.email}</strong> adresine gönderilmiş.
                </p>
              </div>
            )
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Daveti kabul etmek için giriş yapın veya hesap oluşturun.
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {isLoggedIn && userEmail === invitation?.email ? (
            <Button className="w-full" onClick={handleAccept} disabled={accepting}>
              {accepting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Daveti Kabul Et
            </Button>
          ) : (
            <>
              <Button className="w-full" onClick={handleLogin}>
                Giriş Yap
              </Button>
              <Button variant="outline" className="w-full" onClick={handleRegister}>
                Yeni Hesap Oluştur
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
