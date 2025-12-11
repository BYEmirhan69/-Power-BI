"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  MoreVertical,
  Calendar,
  Clock,
  RefreshCw,
  Play,
  Pause,
  Edit,
  Eye,
  FileSpreadsheet,
  File,
  Loader2,
  AlertCircle,
  LayoutDashboard,
  Mail,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import type { Report, ReportFormat, Dashboard } from "@/types/database.types";

interface ReportWithRelations extends Report {
  dashboard?: {
    id: string;
    name: string;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

const formatLabels: Record<ReportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
  csv: "CSV",
};

const formatIcons: Record<ReportFormat, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-red-500" />,
  excel: <FileSpreadsheet className="h-4 w-4 text-green-500" />,
  csv: <FileText className="h-4 w-4 text-blue-500" />,
};

const formatColors: Record<ReportFormat, string> = {
  pdf: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  excel: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  csv: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const scheduleOptions = [
  { value: "", label: "Zamanlama Yok" },
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
  { value: "quarterly", label: "3 Aylık" },
];

export default function ReportsPage() {
  const { user, profile, loading: authLoading } = useAuth();

  // State
  const [reports, setReports] = useState<ReportWithRelations[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportWithRelations | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFormat, setFormFormat] = useState<ReportFormat>("pdf");
  const [formDashboardId, setFormDashboardId] = useState<string>("");
  const [formSchedule, setFormSchedule] = useState("");
  const [formRecipients, setFormRecipients] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Raporları yükle
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reports");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Raporlar yüklenemedi");
      }

      setReports(data.reports || []);
    } catch (error) {
      console.error("Raporlar yüklenirken hata:", error);
      toast.error("Raporlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  // Dashboard'ları yükle
  const fetchDashboards = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboards");
      const data = await response.json();

      if (response.ok) {
        setDashboards(data.dashboards || []);
      }
    } catch (error) {
      console.error("Dashboard'lar yüklenirken hata:", error);
    }
  }, []);

  useEffect(() => {
    if (user && profile) {
      fetchReports();
      fetchDashboards();
    }
  }, [user, profile, fetchReports, fetchDashboards]);

  // Form sıfırla
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormFormat("pdf");
    setFormDashboardId("");
    setFormSchedule("");
    setFormRecipients("");
    setFormIsActive(true);
    setSelectedReport(null);
  };

  // Rapor oluştur
  const handleCreateReport = async () => {
    if (!formName.trim()) {
      toast.error("Rapor adı gerekli");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          format: formFormat,
          dashboard_id: formDashboardId || null,
          schedule: formSchedule || null,
          recipients: formRecipients ? formRecipients.split(",").map((e) => e.trim()) : null,
          is_active: formIsActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rapor oluşturulamadı");
      }

      toast.success("Rapor başarıyla oluşturuldu");
      setCreateDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Rapor oluşturulurken hata:", error);
      toast.error(err.message || "Rapor oluşturulamadı");
    } finally {
      setActionLoading(false);
    }
  };

  // Rapor düzenle
  const handleEditReport = async () => {
    if (!selectedReport || !formName.trim()) {
      toast.error("Rapor adı gerekli");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/reports/${selectedReport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          format: formFormat,
          dashboard_id: formDashboardId || null,
          schedule: formSchedule || null,
          recipients: formRecipients ? formRecipients.split(",").map((e) => e.trim()) : null,
          is_active: formIsActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rapor güncellenemedi");
      }

      toast.success("Rapor başarıyla güncellendi");
      setEditDialogOpen(false);
      resetForm();
      fetchReports();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Rapor güncellenirken hata:", error);
      toast.error(err.message || "Rapor güncellenemedi");
    } finally {
      setActionLoading(false);
    }
  };

  // Rapor sil
  const handleDeleteReport = async () => {
    if (!selectedReport) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/reports/${selectedReport.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rapor silinemedi");
      }

      toast.success("Rapor başarıyla silindi");
      setDeleteDialogOpen(false);
      setSelectedReport(null);
      fetchReports();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Rapor silinirken hata:", error);
      toast.error(err.message || "Rapor silinemedi");
    } finally {
      setActionLoading(false);
    }
  };

  // Rapor üret
  const handleGenerateReport = async (report: ReportWithRelations) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/reports/${report.id}/generate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rapor üretilemedi");
      }

      toast.success("Rapor başarıyla oluşturuldu");
      fetchReports();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Rapor üretilirken hata:", error);
      toast.error(err.message || "Rapor üretilemedi");
    } finally {
      setActionLoading(false);
    }
  };

  // Aktiflik durumunu değiştir
  const handleToggleActive = async (report: ReportWithRelations) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !report.is_active }),
      });

      if (!response.ok) {
        throw new Error("Durum güncellenemedi");
      }

      toast.success(report.is_active ? "Rapor devre dışı bırakıldı" : "Rapor aktifleştirildi");
      fetchReports();
    } catch (error) {
      toast.error("Durum güncellenemedi");
    }
  };

  // Düzenleme modalını aç
  const openEditDialog = (report: ReportWithRelations) => {
    setSelectedReport(report);
    setFormName(report.name);
    setFormDescription(report.description || "");
    setFormFormat(report.format);
    setFormDashboardId(report.dashboard_id || "");
    setFormSchedule(report.schedule || "");
    setFormRecipients(
      Array.isArray(report.recipients) ? (report.recipients as string[]).join(", ") : ""
    );
    setFormIsActive(report.is_active);
    setEditDialogOpen(true);
  };

  // Filtrelenmiş raporlar
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = filterFormat === "all" || report.format === filterFormat;
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && report.is_active) ||
      (filterActive === "inactive" && !report.is_active);

    return matchesSearch && matchesFormat && matchesActive;
  });

  // İstatistikler
  const stats = {
    total: reports.length,
    active: reports.filter((r) => r.is_active).length,
    scheduled: reports.filter((r) => r.schedule).length,
    generated: reports.filter((r) => r.last_generated_at).length,
  };

  // Tarih formatlama
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Raporlar
          </h1>
          <p className="text-muted-foreground">
            Raporlarınızı oluşturun, yönetin ve zamanlanmış dışa aktarımlar ayarlayın
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Rapor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yeni Rapor Oluştur</DialogTitle>
              <DialogDescription>
                Dashboard verilerinizi dışa aktarmak için yeni bir rapor oluşturun
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Rapor Adı *</Label>
                <Input
                  id="name"
                  placeholder="Örn: Aylık Satış Raporu"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  placeholder="Rapor hakkında kısa açıklama..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Format *</Label>
                  <Select value={formFormat} onValueChange={(v) => setFormFormat(v as ReportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4 text-red-500" />
                          PDF
                        </div>
                      </SelectItem>
                      <SelectItem value="excel">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 text-green-500" />
                          Excel
                        </div>
                      </SelectItem>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          CSV
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">Zamanlama</Label>
                  <Select value={formSchedule} onValueChange={setFormSchedule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value || "none"}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard">Dashboard (Opsiyonel)</Label>
                <Select value={formDashboardId || "none"} onValueChange={(value) => setFormDashboardId(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Dashboard seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Dashboard seçilmedi</SelectItem>
                    {dashboards.map((dashboard) => (
                      <SelectItem key={dashboard.id} value={dashboard.id}>
                        {dashboard.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipients">Alıcılar (Virgülle Ayrılmış E-postalar)</Label>
                <Input
                  id="recipients"
                  placeholder="ornek@email.com, diger@email.com"
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Aktif</Label>
                <Switch
                  id="is_active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleCreateReport} disabled={actionLoading}>
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Oluştur
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Rapor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktif Rapor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zamanlanmış
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Üretilmiş
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.generated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rapor ara..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterFormat} onValueChange={setFilterFormat}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Formatlar</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Pasif</SelectItem>
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={fetchReports}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Yenile</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Raporlar ({filteredReports.length})</CardTitle>
          <CardDescription>
            Oluşturduğunuz ve yönettiğiniz tüm raporlar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Rapor Bulunamadı</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || filterFormat !== "all" || filterActive !== "all"
                  ? "Arama kriterlerinize uygun rapor bulunamadı"
                  : "Henüz rapor oluşturmadınız. Yeni rapor ekleyin."}
              </p>
              {!searchQuery && filterFormat === "all" && filterActive === "all" && (
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Rapor Oluştur
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rapor Adı</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Dashboard</TableHead>
                    <TableHead>Zamanlama</TableHead>
                    <TableHead>Son Üretim</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{report.name}</span>
                          {report.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {report.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={formatColors[report.format]}>
                          <span className="flex items-center gap-1">
                            {formatIcons[report.format]}
                            {formatLabels[report.format]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.dashboard ? (
                          <div className="flex items-center gap-1 text-sm">
                            <LayoutDashboard className="h-3 w-3" />
                            {report.dashboard.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.schedule ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {scheduleOptions.find((s) => s.value === report.schedule)?.label ||
                              report.schedule}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.last_generated_at ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDate(report.last_generated_at)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Henüz üretilmedi</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.is_active ? "default" : "secondary"}>
                          {report.is_active ? "Aktif" : "Pasif"}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => handleGenerateReport(report)}>
                              <Play className="h-4 w-4 mr-2" />
                              Şimdi Üret
                            </DropdownMenuItem>
                            {report.file_url && (
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                İndir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(report)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(report)}>
                              {report.is_active ? (
                                <>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Devre Dışı Bırak
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Aktifleştir
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedReport(report);
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Raporu Düzenle</DialogTitle>
            <DialogDescription>
              Rapor ayarlarını güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Rapor Adı *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={formFormat} onValueChange={(v) => setFormFormat(v as ReportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Zamanlama</Label>
                <Select value={formSchedule || "none"} onValueChange={(v) => setFormSchedule(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((opt) => (
                      <SelectItem key={opt.value || "none"} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dashboard</Label>
              <Select value={formDashboardId || "none"} onValueChange={(value) => setFormDashboardId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Dashboard seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Dashboard seçilmedi</SelectItem>
                  {dashboards.map((dashboard) => (
                    <SelectItem key={dashboard.id} value={dashboard.id}>
                      {dashboard.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alıcılar</Label>
              <Input
                placeholder="ornek@email.com, diger@email.com"
                value={formRecipients}
                onChange={(e) => setFormRecipients(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleEditReport} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raporu Sil</DialogTitle>
            <DialogDescription>
              <strong>{selectedReport?.name}</strong> raporunu silmek istediğinizden emin misiniz?
              Bu işlem geri alınabilir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteReport} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
