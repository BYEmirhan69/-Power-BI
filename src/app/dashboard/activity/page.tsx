"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  BarChart3,
  FileSpreadsheet,
  Database,
  Upload,
  Settings,
  Trash2,
  Edit,
  Plus,
  Eye,
  Download,
  Share2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { ActivityLog, Profile } from "@/types/database.types";

// Aktivite türleri
const actionLabels: Record<string, string> = {
  // Genel işlemler
  create: "Oluşturuldu",
  update: "Güncellendi",
  delete: "Silindi",
  view: "Görüntülendi",
  export: "Dışa Aktarıldı",
  import: "İçe Aktarıldı",
  share: "Paylaşıldı",
  // Auth işlemleri
  login: "Giriş Yaptı",
  logout: "Çıkış Yaptı",
  register: "Kayıt Oldu",
  password_change: "Şifre Değiştirildi",
  // Spesifik işlemler
  dashboard_create: "Dashboard Oluşturuldu",
  dashboard_update: "Dashboard Güncellendi",
  dashboard_delete: "Dashboard Silindi",
  chart_create: "Grafik Oluşturuldu",
  chart_update: "Grafik Güncellendi",
  chart_delete: "Grafik Silindi",
  dataset_upload: "Veri Seti Yüklendi",
  dataset_delete: "Veri Seti Silindi",
  report_generate: "Rapor Oluşturuldu",
  report_export: "Rapor Dışa Aktarıldı",
  user_invite: "Kullanıcı Davet Edildi",
  user_remove: "Kullanıcı Çıkarıldı",
  role_change: "Rol Değiştirildi",
  settings_update: "Ayarlar Güncellendi",
};

const entityLabels: Record<string, string> = {
  dashboard: "Dashboard",
  chart: "Grafik",
  dataset: "Veri Seti",
  report: "Rapor",
  user: "Kullanıcı",
  organization: "Organizasyon",
  data_source: "Veri Kaynağı",
  settings: "Ayarlar",
  auth: "Kimlik Doğrulama",
};

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  view: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  export: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  import: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  share: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  login: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  logout: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

const entityIcons: Record<string, React.ElementType> = {
  dashboard: BarChart3,
  chart: BarChart3,
  dataset: FileSpreadsheet,
  report: Download,
  user: User,
  organization: Settings,
  data_source: Database,
  settings: Settings,
  auth: User,
};

interface ActivityLogWithProfile extends ActivityLog {
  profiles?: Profile | null;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

export default function ActivityPage() {
  const { user, profile, loading: authLoading } = useAuth();

  // State
  const [activities, setActivities] = useState<ActivityLogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    byAction: {},
    byEntity: {},
  });

  const pageSize = 20;

  // Aktiviteleri getir (API üzerinden)
  const fetchActivities = useCallback(async () => {
    if (!profile?.organization_id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        action: actionFilter,
        entity: entityFilter,
        date: dateFilter,
        search: searchQuery,
      });

      const response = await fetch(`/api/activity?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setTotalCount(data.totalCount || 0);
      } else {
        const errorData = await response.json();
        toast.error("Hata", { description: errorData.error || "Aktiviteler yüklenemedi." });
      }
    } catch (error) {
      console.error("Aktiviteler getirilemedi:", error);
      toast.error("Hata", { description: "Aktivite logları yüklenirken bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, actionFilter, entityFilter, dateFilter, searchQuery, currentPage]);

  // İstatistikleri getir (API üzerinden)
  const fetchStats = useCallback(async () => {
    if (!profile?.organization_id) return;

    try {
      const response = await fetch("/api/activity", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {
          total: 0,
          today: 0,
          thisWeek: 0,
          byAction: {},
          byEntity: {},
        });
      }
    } catch (error) {
      console.error("İstatistikler getirilemedi:", error);
    }
  }, [profile?.organization_id]);

  // İlk yükleme
  useEffect(() => {
    if (user && profile) {
      fetchActivities();
      fetchStats();
    }
  }, [user, profile, fetchActivities, fetchStats]);

  // Filtre değiştiğinde
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, entityFilter, dateFilter, searchQuery]);

  // Yardımcı fonksiyonlar
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "?";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Az önce";
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return formatDate(dateString);
  };

  const getActionColor = (action: string) => {
    const baseAction = action.split("_")[0];
    return actionColors[baseAction] || actionColors.view;
  };

  const getActionLabel = (action: string) => {
    return actionLabels[action] || action;
  };

  const getEntityLabel = (entity: string) => {
    return entityLabels[entity] || entity;
  };

  const getEntityIcon = (entity: string) => {
    return entityIcons[entity] || Activity;
  };

  const getActionIcon = (action: string) => {
    const baseAction = action.split("_")[0];
    switch (baseAction) {
      case "create":
        return Plus;
      case "update":
        return Edit;
      case "delete":
        return Trash2;
      case "view":
        return Eye;
      case "export":
        return Download;
      case "import":
        return Upload;
      case "share":
        return Share2;
      case "login":
      case "logout":
        return User;
      default:
        return Activity;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Aktiviteleri tarihe göre grupla
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = formatDate(activity.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityLogWithProfile[]>);

  // Yükleniyor durumu
  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  // Auth kontrolü
  if (!profile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erişim Gerekli</h2>
            <p className="text-muted-foreground text-center">
              Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Aktivite Logları
            </h1>
            <p className="text-muted-foreground">
              Platformdaki tüm işlemleri izleyin ve takip edin.
            </p>
          </div>

          <Button variant="outline" onClick={() => { fetchActivities(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Aktivite</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString("tr-TR")}</div>
              <p className="text-xs text-muted-foreground">Tüm zamanlar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bugün</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">İşlem yapıldı</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bu Hafta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground">Son 7 gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Çok</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.byEntity).sort((a, b) => b[1] - a[1])[0]?.[0]
                  ? getEntityLabel(Object.entries(stats.byEntity).sort((a, b) => b[1] - a[1])[0][0])
                  : "-"}
              </div>
              <p className="text-xs text-muted-foreground">En aktif modül</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtreler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Aktivite ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="İşlem Türü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm İşlemler</SelectItem>
                  <SelectItem value="create">Oluşturma</SelectItem>
                  <SelectItem value="update">Güncelleme</SelectItem>
                  <SelectItem value="delete">Silme</SelectItem>
                  <SelectItem value="view">Görüntüleme</SelectItem>
                  <SelectItem value="export">Dışa Aktarma</SelectItem>
                  <SelectItem value="import">İçe Aktarma</SelectItem>
                  <SelectItem value="login">Giriş</SelectItem>
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Modül" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Modüller</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="chart">Grafik</SelectItem>
                  <SelectItem value="dataset">Veri Seti</SelectItem>
                  <SelectItem value="report">Rapor</SelectItem>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="data_source">Veri Kaynağı</SelectItem>
                  <SelectItem value="settings">Ayarlar</SelectItem>
                  <SelectItem value="auth">Kimlik Doğrulama</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tarih Aralığı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Zamanlar</SelectItem>
                  <SelectItem value="today">Bugün</SelectItem>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline" className="gap-2">
              <Clock className="h-4 w-4" />
              Zaman Çizelgesi
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2">
              <Database className="h-4 w-4" />
              Tablo Görünümü
            </TabsTrigger>
          </TabsList>

          {/* Timeline View */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-8">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz aktivite kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-8">
                      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                        <div key={date}>
                          <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-2 mb-4">
                            <Badge variant="outline" className="font-medium">
                              {date}
                            </Badge>
                          </div>

                          <div className="relative pl-8 border-l-2 border-muted space-y-6">
                            {dateActivities.map((activity) => {
                              const ActionIcon = getActionIcon(activity.action);
                              const EntityIcon = getEntityIcon(activity.entity_type);
                              const profileData = activity.profiles as unknown as Profile | null;

                              return (
                                <div
                                  key={activity.id}
                                  className="relative group"
                                >
                                  {/* Timeline dot */}
                                  <div className="absolute -left-[25px] p-1 bg-background border-2 border-muted rounded-full group-hover:border-primary transition-colors">
                                    <ActionIcon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                                  </div>

                                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                    {/* Avatar */}
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage
                                        src={profileData?.avatar_url || undefined}
                                      />
                                      <AvatarFallback>
                                        {getInitials(
                                          profileData?.full_name || null,
                                          profileData?.email || ""
                                        )}
                                      </AvatarFallback>
                                    </Avatar>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">
                                          {profileData?.full_name ||
                                            profileData?.email ||
                                            "Sistem"}
                                        </span>
                                        <Badge
                                          className={getActionColor(activity.action)}
                                          variant="secondary"
                                        >
                                          {getActionLabel(activity.action)}
                                        </Badge>
                                      </div>

                                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                        <EntityIcon className="h-3 w-3" />
                                        <span>{getEntityLabel(activity.entity_type)}</span>
                                        {activity.entity_name && (
                                          <>
                                            <span>•</span>
                                            <span className="font-medium text-foreground truncate max-w-[200px]">
                                              {activity.entity_name}
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {activity.metadata && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                          {typeof activity.metadata === "object" &&
                                            activity.metadata !== null &&
                                            "description" in activity.metadata && (
                                              <p>{String((activity.metadata as { description?: string }).description)}</p>
                                            )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Time */}
                                    <div className="text-right shrink-0">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-xs text-muted-foreground cursor-default">
                                            {formatRelativeTime(activity.created_at)}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {formatDate(activity.created_at)} -{" "}
                                          {formatTime(activity.created_at)}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aktivite Listesi</CardTitle>
                <CardDescription>
                  {totalCount.toLocaleString("tr-TR")} aktivite kaydı bulundu
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Filtrelere uygun aktivite bulunamadı.</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kullanıcı</TableHead>
                          <TableHead>İşlem</TableHead>
                          <TableHead>Modül</TableHead>
                          <TableHead>Hedef</TableHead>
                          <TableHead>Tarih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities.map((activity) => {
                          const EntityIcon = getEntityIcon(activity.entity_type);
                          const profileData = activity.profiles as unknown as Profile | null;

                          return (
                            <TableRow key={activity.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={profileData?.avatar_url || undefined}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(
                                        profileData?.full_name || null,
                                        profileData?.email || ""
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate max-w-[150px]">
                                    {profileData?.full_name ||
                                      profileData?.email ||
                                      "Sistem"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getActionColor(activity.action)}
                                  variant="secondary"
                                >
                                  {getActionLabel(activity.action)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <EntityIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>{getEntityLabel(activity.entity_type)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="truncate max-w-[200px] block">
                                  {activity.entity_name || "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm text-muted-foreground cursor-default">
                                      {formatRelativeTime(activity.created_at)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {formatDate(activity.created_at)} -{" "}
                                    {formatTime(activity.created_at)}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Sayfa {currentPage} / {totalPages}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Önceki
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Sonraki
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Activity Summary by Entity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Modül Bazlı Dağılım</CardTitle>
              <CardDescription>En çok aktivite görülen modüller</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byEntity)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([entity, count]) => {
                    const EntityIcon = getEntityIcon(entity);
                    const percentage = stats.total ? Math.round((count / stats.total) * 100) : 0;

                    return (
                      <div key={entity} className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <EntityIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{getEntityLabel(entity)}</span>
                            <span className="text-sm text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İşlem Türleri</CardTitle>
              <CardDescription>En çok yapılan işlem türleri</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.byAction)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([action, count]) => {
                    const ActionIcon = getActionIcon(action);
                    const percentage = stats.total ? Math.round((count / stats.total) * 100) : 0;

                    return (
                      <div key={action} className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <ActionIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{action}</span>
                            <span className="text-sm text-muted-foreground">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-muted-foreground/50 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
