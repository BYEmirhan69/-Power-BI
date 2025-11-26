"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Database,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Globe,
  FileSpreadsheet,
  Code,
  MoreVertical,
  Trash2,
  Edit,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Calendar,
  Loader2,
  Eye,
  Link2,
  Copy,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import type { DataSource, DataSourceType, SyncStatus, Profile } from "@/types/database.types";

interface DataSourceWithProfile extends DataSource {
  profiles?: Profile | null;
}

interface DataSourceStats {
  total: number;
  active: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

// Tip etiketleri ve renkleri
const typeLabels: Record<DataSourceType, string> = {
  api: "API",
  csv: "CSV",
  excel: "Excel",
  scraping: "Web Scraping",
  manual: "Manuel",
};

const typeIcons: Record<DataSourceType, React.ElementType> = {
  api: Globe,
  csv: FileSpreadsheet,
  excel: FileSpreadsheet,
  scraping: Code,
  manual: Edit,
};

const typeColors: Record<DataSourceType, string> = {
  api: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  csv: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  excel: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  scraping: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  manual: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusLabels: Record<SyncStatus | "never", string> = {
  success: "Başarılı",
  failed: "Başarısız",
  pending: "Bekliyor",
  never: "Hiç Senkronize Edilmedi",
};

const statusColors: Record<SyncStatus | "never", string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  never: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusIcons: Record<SyncStatus | "never", React.ElementType> = {
  success: CheckCircle,
  failed: XCircle,
  pending: Clock,
  never: AlertCircle,
};

// Zamanlama seçenekleri
const scheduleOptions = [
  { value: "", label: "Manuel" },
  { value: "0 * * * *", label: "Saatlik" },
  { value: "0 0 * * *", label: "Günlük (00:00)" },
  { value: "0 8 * * *", label: "Günlük (08:00)" },
  { value: "0 0 * * 1", label: "Haftalık (Pazartesi)" },
  { value: "0 0 1 * *", label: "Aylık (Ayın 1'i)" },
];

export default function DataSourcesPage() {
  const { profile, loading: authLoading } = useAuth();

  // State
  const [dataSources, setDataSources] = useState<DataSourceWithProfile[]>([]);
  const [stats, setStats] = useState<DataSourceStats>({
    total: 0,
    active: 0,
    byType: {},
    byStatus: {},
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSourceWithProfile | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<DataSourceType>("api");
  const [formConfig, setFormConfig] = useState("");
  const [formCredentials, setFormCredentials] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Veri kaynaklarını getir
  const fetchDataSources = useCallback(async () => {
    try {
      const response = await fetch("/api/data-sources");
      if (response.ok) {
        const data = await response.json();
        setDataSources(data.dataSources || []);
        setStats(data.stats || { total: 0, active: 0, byType: {}, byStatus: {} });
      } else {
        const errorData = await response.json();
        toast.error("Hata", { description: errorData.error });
      }
    } catch (error) {
      console.error("Veri kaynakları getirilemedi:", error);
      toast.error("Hata", { description: "Veri kaynakları yüklenirken bir hata oluştu." });
    } finally {
      setLoading(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    if (profile) {
      fetchDataSources();
    }
  }, [profile, fetchDataSources]);

  // Form reset
  const resetForm = () => {
    setFormName("");
    setFormType("api");
    setFormConfig("");
    setFormCredentials("");
    setFormSchedule("");
  };

  // Veri kaynağı oluştur
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Hata", { description: "İsim gerekli." });
      return;
    }

    setFormLoading(true);
    try {
      let config = null;
      let credentials = null;

      if (formConfig.trim()) {
        try {
          config = JSON.parse(formConfig);
        } catch {
          toast.error("Hata", { description: "Geçersiz yapılandırma JSON formatı." });
          setFormLoading(false);
          return;
        }
      }

      if (formCredentials.trim()) {
        try {
          credentials = JSON.parse(formCredentials);
        } catch {
          toast.error("Hata", { description: "Geçersiz kimlik bilgisi JSON formatı." });
          setFormLoading(false);
          return;
        }
      }

      const response = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          config,
          credentials,
          sync_schedule: formSchedule || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setCreateDialogOpen(false);
        resetForm();
        fetchDataSources();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Oluşturma hatası:", error);
      toast.error("Hata", { description: "Veri kaynağı oluşturulamadı." });
    } finally {
      setFormLoading(false);
    }
  };

  // Veri kaynağı güncelle
  const handleUpdate = async () => {
    if (!selectedDataSource || !formName.trim()) return;

    setFormLoading(true);
    try {
      let config = null;
      let credentials = null;

      if (formConfig.trim()) {
        try {
          config = JSON.parse(formConfig);
        } catch {
          toast.error("Hata", { description: "Geçersiz yapılandırma JSON formatı." });
          setFormLoading(false);
          return;
        }
      }

      if (formCredentials.trim()) {
        try {
          credentials = JSON.parse(formCredentials);
        } catch {
          toast.error("Hata", { description: "Geçersiz kimlik bilgisi JSON formatı." });
          setFormLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/data-sources/${selectedDataSource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: formType,
          config,
          credentials,
          sync_schedule: formSchedule || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setEditDialogOpen(false);
        setSelectedDataSource(null);
        resetForm();
        fetchDataSources();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      toast.error("Hata", { description: "Veri kaynağı güncellenemedi." });
    } finally {
      setFormLoading(false);
    }
  };

  // Veri kaynağı sil
  const handleDelete = async () => {
    if (!selectedDataSource) return;

    setFormLoading(true);
    try {
      const response = await fetch(`/api/data-sources/${selectedDataSource.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setDeleteDialogOpen(false);
        setSelectedDataSource(null);
        fetchDataSources();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Hata", { description: "Veri kaynağı silinemedi." });
    } finally {
      setFormLoading(false);
    }
  };

  // Aktif/Pasif durumu değiştir
  const handleToggleActive = async (dataSource: DataSourceWithProfile) => {
    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !dataSource.is_active }),
      });

      if (response.ok) {
        toast.success(dataSource.is_active ? "Devre dışı bırakıldı" : "Etkinleştirildi");
        fetchDataSources();
      } else {
        const data = await response.json();
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Durum değiştirme hatası:", error);
      toast.error("Hata", { description: "Durum değiştirilemedi." });
    }
  };

  // Düzenleme dialogunu aç
  const openEditDialog = (dataSource: DataSourceWithProfile) => {
    setSelectedDataSource(dataSource);
    setFormName(dataSource.name);
    setFormType(dataSource.type);
    setFormConfig(dataSource.config ? JSON.stringify(dataSource.config, null, 2) : "");
    setFormCredentials(dataSource.credentials ? JSON.stringify(dataSource.credentials, null, 2) : "");
    setFormSchedule(dataSource.sync_schedule || "");
    setEditDialogOpen(true);
  };

  // Filtrelenmiş veri kaynakları
  const filteredDataSources = dataSources.filter((ds) => {
    const matchesSearch =
      ds.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || ds.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "never" && !ds.last_sync_status) ||
      ds.last_sync_status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Yardımcı fonksiyonlar
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScheduleLabel = (schedule: string | null) => {
    if (!schedule) return "Manuel";
    const option = scheduleOptions.find((o) => o.value === schedule);
    return option?.label || schedule;
  };

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
              <Database className="h-8 w-8" />
              Veri Kaynakları
            </h1>
            <p className="text-muted-foreground">
              API, dosya ve web scraping kaynaklarınızı yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchDataSources}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>

            <Dialog open={createDialogOpen} onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Kaynak
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Yeni Veri Kaynağı</DialogTitle>
                  <DialogDescription>
                    Yeni bir veri kaynağı ekleyin ve yapılandırın.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Kaynak Adı *</Label>
                      <Input
                        id="name"
                        placeholder="Örn: Satış API"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Kaynak Türü</Label>
                      <Select value={formType} onValueChange={(v) => setFormType(v as DataSourceType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="csv">CSV Dosyası</SelectItem>
                          <SelectItem value="excel">Excel Dosyası</SelectItem>
                          <SelectItem value="scraping">Web Scraping</SelectItem>
                          <SelectItem value="manual">Manuel Giriş</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule">Otomatik Senkronizasyon</Label>
                    <Select value={formSchedule} onValueChange={setFormSchedule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Manuel (zamanlama yok)" />
                      </SelectTrigger>
                      <SelectContent>
                        {scheduleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value || "manual"}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="config">Yapılandırma (JSON)</Label>
                    <Textarea
                      id="config"
                      placeholder='{"url": "https://api.example.com", "method": "GET"}'
                      value={formConfig}
                      onChange={(e) => setFormConfig(e.target.value)}
                      className="font-mono text-sm min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      API URL, başlıklar veya scraping seçicileri gibi yapılandırma bilgileri
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credentials">Kimlik Bilgileri (JSON)</Label>
                    <Textarea
                      id="credentials"
                      placeholder='{"api_key": "your-secret-key"}'
                      value={formCredentials}
                      onChange={(e) => setFormCredentials(e.target.value)}
                      className="font-mono text-sm min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      API anahtarları, tokenlar veya şifreler (güvenli şekilde saklanır)
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleCreate} disabled={formLoading}>
                    {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Oluştur
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Kaynak</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{stats.active} aktif</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Kaynakları</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byType["api"] || 0}</div>
              <p className="text-xs text-muted-foreground">REST/GraphQL endpoint</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dosya Kaynakları</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.byType["csv"] || 0) + (stats.byType["excel"] || 0)}
              </div>
              <p className="text-xs text-muted-foreground">CSV ve Excel dosyaları</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Başarılı Senkronizasyon</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus["success"] || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.byStatus["failed"] || 0} başarısız
              </p>
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
                    placeholder="Kaynak ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Kaynak Türü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Türler</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="scraping">Web Scraping</SelectItem>
                  <SelectItem value="manual">Manuel</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="success">Başarılı</SelectItem>
                  <SelectItem value="failed">Başarısız</SelectItem>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="never">Hiç Senkronize Edilmedi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Sources Table */}
        <Card>
          <CardHeader>
            <CardTitle>Kaynak Listesi</CardTitle>
            <CardDescription>
              {filteredDataSources.length} kaynak bulundu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredDataSources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">
                  {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                    ? "Filtrelere uygun kaynak bulunamadı."
                    : "Henüz veri kaynağı eklenmemiş."}
                </p>
                {!searchQuery && typeFilter === "all" && statusFilter === "all" && (
                  <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Kaynağı Ekle
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kaynak</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Son Senkronizasyon</TableHead>
                      <TableHead>Zamanlama</TableHead>
                      <TableHead>Aktif</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDataSources.map((ds) => {
                      const TypeIcon = typeIcons[ds.type];
                      const syncStatus = ds.last_sync_status || "never";
                      const StatusIcon = statusIcons[syncStatus];

                      return (
                        <TableRow key={ds.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeColors[ds.type].split(" ")[0]}`}>
                                <TypeIcon className={`h-5 w-5 ${typeColors[ds.type].split(" ").slice(1).join(" ")}`} />
                              </div>
                              <div>
                                <p className="font-medium">{ds.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  v{ds.version}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={typeColors[ds.type]} variant="secondary">
                              {typeLabels[ds.type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusColors[syncStatus].split(" ").slice(1).join(" ")}`} />
                              <Badge className={statusColors[syncStatus]} variant="secondary">
                                {statusLabels[syncStatus]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm cursor-default">
                                  {formatDate(ds.last_sync_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {ds.last_sync_at
                                  ? `Son güncelleme: ${formatDate(ds.last_sync_at)}`
                                  : "Henüz senkronize edilmedi"}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getScheduleLabel(ds.sync_schedule)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={ds.is_active}
                              onCheckedChange={() => handleToggleActive(ds)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDataSource(ds);
                                    setDetailDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Detayları Gör
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(ds)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Play className="h-4 w-4 mr-2" />
                                  Şimdi Senkronize Et
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedDataSource(ds);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedDataSource(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Veri Kaynağını Düzenle</DialogTitle>
              <DialogDescription>
                {selectedDataSource?.name} kaynağının ayarlarını güncelleyin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Kaynak Adı *</Label>
                  <Input
                    id="edit-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Kaynak Türü</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as DataSourceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="csv">CSV Dosyası</SelectItem>
                      <SelectItem value="excel">Excel Dosyası</SelectItem>
                      <SelectItem value="scraping">Web Scraping</SelectItem>
                      <SelectItem value="manual">Manuel Giriş</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-schedule">Otomatik Senkronizasyon</Label>
                <Select value={formSchedule || "manual"} onValueChange={(v) => setFormSchedule(v === "manual" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((option) => (
                      <SelectItem key={option.value || "manual"} value={option.value || "manual"}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-config">Yapılandırma (JSON)</Label>
                <Textarea
                  id="edit-config"
                  value={formConfig}
                  onChange={(e) => setFormConfig(e.target.value)}
                  className="font-mono text-sm min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-credentials">Kimlik Bilgileri (JSON)</Label>
                <Textarea
                  id="edit-credentials"
                  value={formCredentials}
                  onChange={(e) => setFormCredentials(e.target.value)}
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdate} disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Veri Kaynağını Sil</DialogTitle>
              <DialogDescription>
                <strong>{selectedDataSource?.name}</strong> kaynağını silmek istediğinize emin misiniz?
                Bu işlem geri alınamaz ve ilişkili tüm veriler kaybolabilir.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                İptal
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedDataSource && (
                  <>
                    {(() => {
                      const Icon = typeIcons[selectedDataSource.type];
                      return <Icon className="h-5 w-5" />;
                    })()}
                    {selectedDataSource.name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Veri kaynağı detayları ve yapılandırması
              </DialogDescription>
            </DialogHeader>

            {selectedDataSource && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tür</Label>
                    <p className="font-medium">{typeLabels[selectedDataSource.type]}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Durum</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={selectedDataSource.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                        {selectedDataSource.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Versiyon</Label>
                    <p className="font-medium">v{selectedDataSource.version}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Zamanlama</Label>
                    <p className="font-medium">{getScheduleLabel(selectedDataSource.sync_schedule)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Son Senkronizasyon</Label>
                    <p className="font-medium">{formatDate(selectedDataSource.last_sync_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Son Durum</Label>
                    <Badge className={statusColors[selectedDataSource.last_sync_status || "never"]}>
                      {statusLabels[selectedDataSource.last_sync_status || "never"]}
                    </Badge>
                  </div>
                </div>

                {selectedDataSource.config && (
                  <div>
                    <Label className="text-muted-foreground">Yapılandırma</Label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-[200px] font-mono">
                      {JSON.stringify(selectedDataSource.config, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Label className="text-muted-foreground">Kaynak ID:</Label>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{selectedDataSource.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedDataSource.id);
                      toast.success("ID kopyalandı");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Kapat
              </Button>
              <Button onClick={() => {
                setDetailDialogOpen(false);
                if (selectedDataSource) openEditDialog(selectedDataSource);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
