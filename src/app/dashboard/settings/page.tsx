"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  User,
  Building2,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Textarea - şu an kullanılmıyor
// import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSettings {
  emailNotifications: boolean;
  reportAlerts: boolean;
  dataUpdateAlerts: boolean;
  securityAlerts: boolean;
  marketingEmails: boolean;
}

interface OrganizationData {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const _supabase = createClient();  
  const searchParams = useSearchParams();
  
  // Get initial tab from URL params
  const initialTab = searchParams.get("tab") || "profile";

  // Profile state
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // Organization state
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [userRole, setUserRole] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState(true);

  // Security state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    reportAlerts: true,
    dataUpdateAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Appearance state
  const [theme, setTheme] = useState("system");

  // Initialize profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Fetch organization data
  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/organization");
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setOrgName(data.organization?.name || "");
        setMemberCount(data.memberCount || 0);
        setUserRole(data.userRole || "user");
      }
    } catch (error) {
      console.error("Organizasyon getirme hatası:", error);
    } finally {
      setOrgLoading(false);
    }
  }, []);

  // Fetch notification settings
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.settings);
      }
    } catch (error) {
      console.error("Bildirim ayarları getirme hatası:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchOrganization();
      fetchNotifications();
    }
  }, [user, fetchOrganization, fetchNotifications]);

  // Update profile
  const handleUpdateProfile = async () => {
    // Validation
    if (!fullName.trim()) {
      toast.error("Hata", { description: "Ad Soyad alanı boş olamaz." });
      return;
    }

    setProfileLoading(true);
    
    // Store previous values for rollback
    const previousName = profile?.full_name || "";
    const previousAvatar = profile?.avatar_url || "";
    
    // Show immediate feedback
    toast.loading("Profil güncelleniyor...", { id: "profile-update" });

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), avatar_url: avatarUrl.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use the returned profile data directly instead of making another request
        // This is faster than calling refreshProfile()
        toast.success("Profil güncellendi", {
          id: "profile-update",
          description: "Profil bilgileriniz başarıyla kaydedildi.",
        });
        // Refresh profile in background for global state sync
        refreshProfile();
      } else {
        // Rollback on error
        setFullName(previousName);
        setAvatarUrl(previousAvatar);
        toast.error("Hata", { id: "profile-update", description: data.error || "Profil güncellenemedi." });
      }
    } catch {
      // Rollback on error
      setFullName(previousName);
      setAvatarUrl(previousAvatar);
      toast.error("Hata", { id: "profile-update", description: "Profil güncellenirken bir hata oluştu." });
    } finally {
      setProfileLoading(false);
    }
  };

  // Update organization
  const handleUpdateOrganization = async () => {
    // Validation
    if (!orgName.trim()) {
      toast.error("Hata", { description: "Organizasyon adı boş olamaz." });
      return;
    }

    setOrgLoading(true);
    
    // Store previous value for rollback
    const previousOrgName = organization?.name || "";
    
    // Show immediate feedback
    toast.loading("Organizasyon güncelleniyor...", { id: "org-update" });

    try {
      const response = await fetch("/api/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setOrganization(data.organization);
        toast.success("Organizasyon güncellendi", {
          id: "org-update",
          description: "Organizasyon bilgileri başarıyla kaydedildi.",
        });
      } else {
        // Rollback on error
        setOrgName(previousOrgName);
        toast.error("Hata", { id: "org-update", description: data.error || "Organizasyon güncellenemedi." });
      }
    } catch {
      // Rollback on error
      setOrgName(previousOrgName);
      toast.error("Hata", { id: "org-update", description: "Organizasyon güncellenirken bir hata oluştu." });
    } finally {
      setOrgLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Hata", { description: "Şifreler eşleşmiyor." });
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Hata", { description: "Şifre en az 6 karakter olmalıdır." });
      return;
    }

    setPasswordLoading(true);
    toast.loading("Şifre değiştiriliyor...", { id: "password-change" });

    try {
      const response = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Şifre değiştirildi", {
          id: "password-change",
          description: "Şifreniz başarıyla güncellendi.",
        });
      } else {
        const data = await response.json();
        toast.error("Hata", { id: "password-change", description: data.error || "Şifre değiştirilemedi." });
      }
    } catch {
      toast.error("Hata", { id: "password-change", description: "Şifre değiştirilirken bir hata oluştu." });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Update notifications
  const handleUpdateNotifications = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    // Store previous state for rollback
    const previousSettings = { ...notifications };
    
    // Optimistic update - immediately show the change
    const updatedSettings = { ...notifications, [key]: value };
    setNotifications(updatedSettings);

    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      if (response.ok) {
        toast.success("Ayar güncellendi", {
          description: "Bildirim tercihiniz kaydedildi.",
        });
      } else {
        // Revert on error
        setNotifications(previousSettings);
        const data = await response.json();
        toast.error("Hata", { description: data.error || "Ayar güncellenemedi." });
      }
    } catch {
      // Revert on error
      setNotifications(previousSettings);
      toast.error("Hata", { description: "Ayar güncellenirken bir hata oluştu." });
    }
  };

  // Update theme
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    document.documentElement.classList.remove("light", "dark");
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.add(newTheme);
    }
    localStorage.setItem("theme", newTheme);
    toast.success("Tema güncellendi", {
      description: `${newTheme === "light" ? "Açık" : newTheme === "dark" ? "Koyu" : "Sistem"} tema aktif edildi.`,
    });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground">
          Hesap ve uygulama ayarlarınızı yönetin.
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Organizasyon</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Güvenlik</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Görünüm</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>
                Kişisel bilgilerinizi ve profil resminizi güncelleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} alt={fullName} />
                  <AvatarFallback className="text-lg">
                    {getInitials(fullName || user?.email || "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="avatar_url">Profil Resmi URL</Label>
                  <Input
                    id="avatar_url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Geçerli bir resim URL&apos;si girin.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Ad Soyad</Label>
                  <Input
                    id="full_name"
                    placeholder="Adınız Soyadınız"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    E-posta adresi değiştirilemez.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                    {profile?.role === "admin"
                      ? "Yönetici"
                      : profile?.role === "developer"
                        ? "Geliştirici"
                        : "Kullanıcı"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpdateProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organizasyon Ayarları</CardTitle>
              <CardDescription>
                Organizasyon bilgilerini yönetin.
                {userRole !== "admin" && (
                  <span className="text-yellow-600 ml-2">
                    (Sadece yöneticiler düzenleyebilir)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {orgLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : organization ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="org_name">Organizasyon Adı</Label>
                      <Input
                        id="org_name"
                        placeholder="Organizasyon adı"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={userRole !== "admin"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Üye Sayısı</Label>
                      <div className="flex items-center h-9 px-3 py-1 border rounded-md bg-muted">
                        <span>{memberCount} üye</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Oluşturulma Tarihi</Label>
                      <div className="text-sm text-muted-foreground">
                        {new Date(organization.created_at).toLocaleDateString(
                          "tr-TR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Son Güncelleme</Label>
                      <div className="text-sm text-muted-foreground">
                        {new Date(organization.updated_at).toLocaleDateString(
                          "tr-TR",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  {userRole === "admin" && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleUpdateOrganization}
                        disabled={orgLoading}
                      >
                        {orgLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Değişiklikleri Kaydet
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz bir organizasyona üye değilsiniz.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Şifre Değiştir</CardTitle>
              <CardDescription>
                Hesap güvenliğiniz için güçlü bir şifre kullanın.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new_password">Yeni Şifre</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Şifre Tekrar</Label>
                  <Input
                    id="confirm_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Şifreniz en az 6 karakter uzunluğunda olmalıdır.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                >
                  {passwordLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Şifreyi Değiştir
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Oturum Bilgileri</CardTitle>
              <CardDescription>
                Aktif oturumunuz hakkında bilgiler.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">E-posta</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Son Giriş</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString("tr-TR")
                        : "Bilinmiyor"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Hesap Oluşturulma</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleString("tr-TR")
                        : "Bilinmiyor"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bildirim Tercihleri</CardTitle>
              <CardDescription>
                Hangi bildirimleri almak istediğinizi seçin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">E-posta Bildirimleri</p>
                      <p className="text-sm text-muted-foreground">
                        Genel e-posta bildirimlerini al
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) =>
                        handleUpdateNotifications("emailNotifications", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Rapor Uyarıları</p>
                      <p className="text-sm text-muted-foreground">
                        Raporlar hazır olduğunda bildirim al
                      </p>
                    </div>
                    <Switch
                      checked={notifications.reportAlerts}
                      onCheckedChange={(checked) =>
                        handleUpdateNotifications("reportAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Veri Güncelleme Uyarıları</p>
                      <p className="text-sm text-muted-foreground">
                        Veri kaynakları güncellendiğinde bildirim al
                      </p>
                    </div>
                    <Switch
                      checked={notifications.dataUpdateAlerts}
                      onCheckedChange={(checked) =>
                        handleUpdateNotifications("dataUpdateAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Güvenlik Uyarıları</p>
                      <p className="text-sm text-muted-foreground">
                        Güvenlik ile ilgili önemli bildirimleri al
                      </p>
                    </div>
                    <Switch
                      checked={notifications.securityAlerts}
                      onCheckedChange={(checked) =>
                        handleUpdateNotifications("securityAlerts", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Pazarlama E-postaları</p>
                      <p className="text-sm text-muted-foreground">
                        Yeni özellikler ve güncellemeler hakkında bilgi al
                      </p>
                    </div>
                    <Switch
                      checked={notifications.marketingEmails}
                      onCheckedChange={(checked) =>
                        handleUpdateNotifications("marketingEmails", checked)
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Görünüm Ayarları</CardTitle>
              <CardDescription>
                Uygulama görünümünü özelleştirin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={theme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Tema seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Açık</SelectItem>
                      <SelectItem value="dark">Koyu</SelectItem>
                      <SelectItem value="system">Sistem</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Sistem seçeneği, cihazınızın tema ayarını kullanır.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Önizleme</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      theme === "light"
                        ? "border-primary bg-white"
                        : "border-muted bg-white"
                    }`}
                    onClick={() => handleThemeChange("light")}
                  >
                    <div className="space-y-2">
                      <div className="h-2 w-12 rounded bg-gray-300" />
                      <div className="h-2 w-20 rounded bg-gray-200" />
                      <div className="h-2 w-16 rounded bg-gray-200" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-900">
                      Açık Tema
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      theme === "dark"
                        ? "border-primary bg-gray-900"
                        : "border-muted bg-gray-900"
                    }`}
                    onClick={() => handleThemeChange("dark")}
                  >
                    <div className="space-y-2">
                      <div className="h-2 w-12 rounded bg-gray-600" />
                      <div className="h-2 w-20 rounded bg-gray-700" />
                      <div className="h-2 w-16 rounded bg-gray-700" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-100">
                      Koyu Tema
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      theme === "system"
                        ? "border-primary"
                        : "border-muted"
                    } bg-gradient-to-r from-white to-gray-900`}
                    onClick={() => handleThemeChange("system")}
                  >
                    <div className="space-y-2">
                      <div className="h-2 w-12 rounded bg-gradient-to-r from-gray-300 to-gray-600" />
                      <div className="h-2 w-20 rounded bg-gradient-to-r from-gray-200 to-gray-700" />
                      <div className="h-2 w-16 rounded bg-gradient-to-r from-gray-200 to-gray-700" />
                    </div>
                    <p className="mt-3 text-sm font-medium bg-gradient-to-r from-gray-900 to-gray-100 bg-clip-text text-transparent">
                      Sistem
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dil Ayarları</CardTitle>
              <CardDescription>
                Uygulama dilini seçin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Dil</Label>
                <Select defaultValue="tr">
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Dil seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
