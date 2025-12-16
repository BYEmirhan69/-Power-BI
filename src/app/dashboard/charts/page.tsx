/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useCharts, useDatasets, useDatasetData, invalidateCache } from "@/hooks/use-swr-data";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  AreaChart,
  ScatterChart,
  Grid3X3,
  Radar,
  TrendingUp,
  Plus, 
  Search, 
  MoreHorizontal,
  Eye,
  EyeOff,
  Pencil, 
  Trash2, 
  Code,
  Globe,
  Lock,
  RefreshCw,
  LayoutGrid,
  List,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MiniChart } from "@/components/charts/mini-chart";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Database } from "lucide-react";
import { toast } from "sonner";

// Grafik türleri
const CHART_TYPES = [
  { value: "line", label: "Çizgi Grafik", icon: LineChart },
  { value: "bar", label: "Çubuk Grafik", icon: BarChart3 },
  { value: "pie", label: "Pasta Grafik", icon: PieChart },
  { value: "area", label: "Alan Grafik", icon: AreaChart },
  { value: "scatter", label: "Dağılım Grafik", icon: ScatterChart },
  { value: "heatmap", label: "Isı Haritası", icon: Grid3X3 },
  { value: "radar", label: "Radar Grafik", icon: Radar },
  { value: "combo", label: "Kombine Grafik", icon: TrendingUp },
] as const;

type ChartType = typeof CHART_TYPES[number]["value"];

interface Chart {
  id: string;
  name: string;
  description: string | null;
  type: ChartType;
  config: any;
  filters: any;
  is_public: boolean;
  embed_token: string | null;
  thumbnail_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  dataset_id: string | null;
  datasets?: { id: string; name: string } | null;
  users?: { id: string; email: string; full_name: string | null } | null;
}

interface Dataset {
  id: string;
  name: string;
  schema?: { name: string; type: string }[];
  row_count?: number;
}

export default function ChartsPage() {
  // Debounced search query - 300ms gecikme ile API çağrısı
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  
  // SWR ile veri çekme - cache ve dedup otomatik
  const { 
    charts, 
    isLoading: loading, 
    mutate: mutateCharts 
  } = useCharts({
    type: typeFilter !== "all" ? typeFilter : undefined,
    is_public: visibilityFilter === "public" ? "true" : visibilityFilter === "private" ? "false" : undefined,
    search: debouncedSearch || undefined,
  });
  
  const { datasets } = useDatasets();
  
  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "bar" as ChartType,
    dataset_id: "",
    is_public: false,
    hasDataset: false,
  });
  
  // Embed states
  const [embedCode, setEmbedCode] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dataset preview states - SWR ile
  const [selectedXColumn, setSelectedXColumn] = useState<string>("");
  const [selectedYColumn, setSelectedYColumn] = useState<string>("");
  
  // Dataset data için SWR hook
  const { 
    data: datasetPreviewData, 
    dataset: selectedDatasetInfo,
    isLoading: loadingDatasetPreview 
  } = useDatasetData(
    formData.hasDataset && formData.dataset_id ? formData.dataset_id : null, 
    100
  );
  
  // Schema'yı dataset info'dan al
  const datasetSchema = useMemo(() => 
    selectedDatasetInfo?.schema || [], 
    [selectedDatasetInfo]
  );

  // Default kolon seçimlerini hesapla
  const defaultXColumn = useMemo(() => {
    if (datasetSchema.length === 0) return "";
    const xCol = datasetSchema.find((s: { name: string; type: string }) => s.type === "string" || s.type === "date") || datasetSchema[0];
    return xCol?.name || "";
  }, [datasetSchema]);
  
  const defaultYColumn = useMemo(() => {
    if (datasetSchema.length === 0) return "";
    const yCol = datasetSchema.find((s: { name: string; type: string }) => s.type === "number");
    return yCol?.name || datasetSchema[1]?.name || "";
  }, [datasetSchema]);
  
  // Kolon seçimleri - default değerleri kullan (kullanıcı değiştirmezse)
  const effectiveXColumn = selectedXColumn || defaultXColumn;
  const effectiveYColumn = selectedYColumn || defaultYColumn;

  // İstatistikler - useMemo ile optimize
  const stats = useMemo(() => ({
    total: charts.length,
    public: charts.filter((c: Chart) => c.is_public).length,
    private: charts.filter((c: Chart) => !c.is_public).length,
    totalViews: charts.reduce((sum: number, c: Chart) => sum + (c.view_count || 0), 0),
  }), [charts]);

  // Grafik türüne göre ikon al
  const getChartIcon = (type: ChartType) => {
    const chartType = CHART_TYPES.find(t => t.value === type);
    return chartType?.icon || BarChart3;
  };

  const getChartTypeLabel = (type: ChartType) => {
    const chartType = CHART_TYPES.find(t => t.value === type);
    return chartType?.label || type;
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Grafik adı zorunludur");
      return;
    }

    // Dataset seçildiyse ve kolon seçilmediyse uyar
    if (formData.hasDataset && formData.dataset_id && (!effectiveXColumn || !effectiveYColumn)) {
      toast.error("Lütfen X ve Y eksen kolonlarını seçin");
      return;
    }

    try {
      // Chart config oluştur
      const config: any = {};
      if (formData.hasDataset && formData.dataset_id) {
        config.xColumn = effectiveXColumn;
        config.yColumn = effectiveYColumn;
        config.schema = datasetSchema;
      }

      const response = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          dataset_id: formData.dataset_id || null,
          is_public: formData.is_public,
          config,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Grafik başarıyla oluşturuldu");
        setCreateDialogOpen(false);
        resetForm();
        mutateCharts(); // SWR cache'i yenile
        invalidateCache(/\/api\/charts/); // Tüm charts cache'ini temizle
      } else {
        toast.error(data.error || "Grafik oluşturulurken hata oluştu");
      }
    } catch (error) {
      console.error("Create chart error:", error);
      toast.error("Grafik oluşturulurken hata oluştu");
    }
  };

  const handleEdit = async () => {
    if (!selectedChart || !formData.name.trim()) {
      toast.error("Grafik adı zorunludur");
      return;
    }

    try {
      // Chart config oluştur - spread ile kopyala, doğrudan mutate etme
      const config: any = { ...(selectedChart.config || {}) };
      if (formData.hasDataset && formData.dataset_id) {
        config.xColumn = effectiveXColumn;
        config.yColumn = effectiveYColumn;
        config.schema = datasetSchema;
      }

      const response = await fetch(`/api/charts/${selectedChart.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          dataset_id: formData.dataset_id || null,
          is_public: formData.is_public,
          config,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Grafik başarıyla güncellendi");
        setEditDialogOpen(false);
        setSelectedChart(null);
        resetForm();
        mutateCharts(); // SWR cache'i yenile
      } else {
        toast.error(data.error || "Grafik güncellenirken hata oluştu");
      }
    } catch (error) {
      console.error("Edit chart error:", error);
      toast.error("Grafik güncellenirken hata oluştu");
    }
  };

  const handleDelete = async () => {
    if (!selectedChart) return;

    try {
      const response = await fetch(`/api/charts/${selectedChart.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Grafik başarıyla silindi");
        setDeleteDialogOpen(false);
        setSelectedChart(null);
        mutateCharts(); // SWR cache'i yenile
      } else {
        const data = await response.json();
        toast.error(data.error || "Grafik silinirken hata oluştu");
      }
    } catch (error) {
      console.error("Delete chart error:", error);
      toast.error("Grafik silinirken hata oluştu");
    }
  };

  const handleGetEmbed = async (chart: Chart) => {
    setSelectedChart(chart);
    try {
      const response = await fetch(`/api/charts/${chart.id}/embed`);
      const data = await response.json();
      
      if (response.ok) {
        setEmbedCode(data.iframe_code || "");
        setEmbedUrl(data.embed_url || "");
        setEmbedDialogOpen(true);
      } else {
        toast.error(data.error || "Embed kodu alınırken hata oluştu");
      }
    } catch (error) {
      console.error("Get embed error:", error);
      toast.error("Embed kodu alınırken hata oluştu");
    }
  };

  const handleRegenerateEmbed = async () => {
    if (!selectedChart) return;

    try {
      const response = await fetch(`/api/charts/${selectedChart.id}/embed`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (response.ok) {
        setEmbedUrl(data.embed_url || "");
        setEmbedCode(`<iframe 
  src="${data.embed_url}" 
  width="100%" 
  height="400" 
  frameborder="0" 
  allowfullscreen
  title="${selectedChart.name}"
></iframe>`);
        toast.success("Embed token yenilendi");
        mutateCharts(); // SWR cache'i yenile
      } else {
        toast.error(data.error || "Embed token yenilenirken hata oluştu");
      }
    } catch (error) {
      console.error("Regenerate embed error:", error);
      toast.error("Embed token yenilenirken hata oluştu");
    }
  };

  const copyToClipboard = async (text: string, type: "code" | "url") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      toast.success("Panoya kopyalandı");
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Kopyalama başarısız");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "bar",
      dataset_id: "",
      is_public: false,
      hasDataset: false,
    });
    // SWR ile yönetilen datasetPreviewData ve datasetSchema otomatik temizlenir
    // formData.dataset_id boş olduğunda useDatasetData null döner
    setSelectedXColumn("");
    setSelectedYColumn("");
  };

  const openEditDialog = (chart: Chart) => {
    setSelectedChart(chart);
    setFormData({
      name: chart.name,
      description: chart.description || "",
      type: chart.type,
      dataset_id: chart.dataset_id || "",
      is_public: chart.is_public,
      hasDataset: !!chart.dataset_id,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (chart: Chart) => {
    setSelectedChart(chart);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grafikler</h1>
          <p className="text-muted-foreground">
            Veri görselleştirmelerinizi oluşturun ve yönetin
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Grafik
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Grafik</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Tüm grafikler</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Herkese Açık</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.public}</div>
            <p className="text-xs text-muted-foreground">Paylaşılan grafikler</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Özel</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.private}</div>
            <p className="text-xs text-muted-foreground">Özel grafikler</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Görüntülenme</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString("tr-TR")}</div>
            <p className="text-xs text-muted-foreground">Tüm zamanlarda</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Grafik ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tür" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Türler</SelectItem>
              {CHART_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Görünürlük" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="public">Herkese Açık</SelectItem>
              <SelectItem value="private">Özel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-4"}>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : charts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Henüz grafik yok</h3>
          <p className="text-muted-foreground text-center mt-2">
            İlk grafiğinizi oluşturarak veri görselleştirmeye başlayın
          </p>
          <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            İlk Grafiği Oluştur
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {charts.map((chart: Chart) => {
            const IconComponent = getChartIcon(chart.type);
            return (
              <Card key={chart.id} className="group relative hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base line-clamp-1">{chart.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {getChartTypeLabel(chart.type)}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(chart)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGetEmbed(chart)}>
                          <Code className="mr-2 h-4 w-4" />
                          Embed Kodu
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(chart)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {chart.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {chart.description}
                    </p>
                  )}
                  <div className="h-32 rounded-lg bg-muted/30 mb-3 overflow-hidden p-2">
                    <MiniChart type={chart.type} chartId={chart.id} height={112} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Badge variant={chart.is_public ? "default" : "secondary"} className="text-xs">
                        {chart.is_public ? (
                          <>
                            <Globe className="mr-1 h-3 w-3" />
                            Herkese Açık
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 h-3 w-3" />
                            Özel
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {chart.view_count?.toLocaleString("tr-TR") || 0}
                    </div>
                  </div>
                  {chart.datasets?.name && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Veri Seti: <span className="font-medium">{chart.datasets.name}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left align-middle font-medium">Grafik</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Tür</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Veri Seti</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Görünürlük</th>
                <th className="h-12 px-4 text-left align-middle font-medium">Görüntülenme</th>
                <th className="h-12 px-4 text-right align-middle font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {charts.map((chart: Chart) => {
                const IconComponent = getChartIcon(chart.type);
                return (
                  <tr key={chart.id} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{chart.name}</p>
                          {chart.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {chart.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{getChartTypeLabel(chart.type)}</Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {chart.datasets?.name || "-"}
                    </td>
                    <td className="p-4">
                      <Badge variant={chart.is_public ? "default" : "secondary"}>
                        {chart.is_public ? "Herkese Açık" : "Özel"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        {chart.view_count?.toLocaleString("tr-TR") || 0}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(chart)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Düzenle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGetEmbed(chart)}>
                            <Code className="mr-2 h-4 w-4" />
                            Embed Kodu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(chart)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Yeni Grafik Oluştur</DialogTitle>
            <DialogDescription>
              Yeni bir veri görselleştirmesi oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Grafik Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Grafik adını girin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Grafik açıklaması (isteğe bağlı)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Grafik Türü *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ChartType) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veri Kaynağı</Label>
              <Tabs 
                value={formData.hasDataset ? "with-dataset" : "no-dataset"} 
                onValueChange={(value) => {
                  if (value === "no-dataset") {
                    setFormData({ ...formData, hasDataset: false, dataset_id: "" });
                  } else {
                    setFormData({ ...formData, hasDataset: true });
                  }
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="no-dataset" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Veri Seti Yok
                  </TabsTrigger>
                  <TabsTrigger value="with-dataset" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Veri Seti Var
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="no-dataset" className="mt-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">Manuel Veri Girişi</p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          Grafik oluşturulduktan sonra verileri manuel olarak girebilir veya daha sonra bir veri seti bağlayabilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="with-dataset" className="mt-3 space-y-4">
                  {datasets.length === 0 ? (
                    <div className="rounded-lg border border-muted p-3 text-center">
                      <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Henüz veri seti oluşturulmamış. Önce bir veri seti oluşturun.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select 
                        value={formData.dataset_id || ""} 
                        onValueChange={(value) => setFormData({ ...formData, dataset_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bir veri seti seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.map((dataset: Dataset) => (
                            <SelectItem key={dataset.id} value={dataset.id}>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {dataset.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Dataset seçildiyse kolon seçicileri göster */}
                      {formData.dataset_id && (
                        <>
                          {loadingDatasetPreview ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Veri yükleniyor...</span>
                            </div>
                          ) : datasetSchema.length > 0 ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">X Ekseni (Etiketler)</Label>
                                  <Select 
                                    value={selectedXColumn} 
                                    onValueChange={setSelectedXColumn}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Kolon seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {datasetSchema.map((col: { name: string; type: string }) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1">
                                              {col.type}
                                            </Badge>
                                            {col.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Y Ekseni (Değerler)</Label>
                                  <Select 
                                    value={selectedYColumn} 
                                    onValueChange={setSelectedYColumn}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Kolon seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {datasetSchema.map((col: { name: string; type: string }) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1">
                                              {col.type}
                                            </Badge>
                                            {col.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Grafik Önizleme */}
                              {effectiveXColumn && effectiveYColumn && datasetPreviewData.length > 0 && (
                                <div className="rounded-lg border bg-muted/30 p-3">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Önizleme ({datasetPreviewData.length} satır)
                                  </p>
                                  <div className="h-32">
                                    <MiniChart
                                      type={formData.type}
                                      data={datasetPreviewData.slice(0, 20).map((row: Record<string, unknown>) => Number(row[effectiveYColumn]) || 0)}
                                      labels={datasetPreviewData.slice(0, 20).map((row: Record<string, unknown>) => String(row[effectiveXColumn] || ''))}
                                      height={120}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                  Bu veri setinde henüz veri bulunmuyor.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Herkese Açık</Label>
                <p className="text-sm text-muted-foreground">
                  Bu grafiği herkesin görüntülemesine izin ver
                </p>
              </div>
              <Switch
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate}>Oluştur</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Grafiği Düzenle</DialogTitle>
            <DialogDescription>
              Grafik bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Grafik Adı *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Grafik adını girin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Grafik açıklaması (isteğe bağlı)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Grafik Türü *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ChartType) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Veri Kaynağı</Label>
              <Tabs 
                value={formData.hasDataset ? "with-dataset" : "no-dataset"} 
                onValueChange={(value) => {
                  if (value === "no-dataset") {
                    setFormData({ ...formData, hasDataset: false, dataset_id: "" });
                  } else {
                    setFormData({ ...formData, hasDataset: true });
                  }
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="no-dataset" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Veri Seti Yok
                  </TabsTrigger>
                  <TabsTrigger value="with-dataset" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Veri Seti Var
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="no-dataset" className="mt-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">Manuel Veri Girişi</p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          Grafik verilerini manuel olarak girebilir veya daha sonra bir veri seti bağlayabilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="with-dataset" className="mt-3 space-y-4">
                  {datasets.length === 0 ? (
                    <div className="rounded-lg border border-muted p-3 text-center">
                      <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Henüz veri seti oluşturulmamış. Önce bir veri seti oluşturun.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select 
                        value={formData.dataset_id || ""} 
                        onValueChange={(value) => setFormData({ ...formData, dataset_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bir veri seti seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.map((dataset: Dataset) => (
                            <SelectItem key={dataset.id} value={dataset.id}>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {dataset.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Dataset seçildiyse kolon seçicileri göster */}
                      {formData.dataset_id && (
                        <>
                          {loadingDatasetPreview ? (
                            <div className="flex items-center justify-center py-4">
                              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-sm text-muted-foreground">Veri yükleniyor...</span>
                            </div>
                          ) : datasetSchema.length > 0 ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">X Ekseni (Etiketler)</Label>
                                  <Select 
                                    value={selectedXColumn} 
                                    onValueChange={setSelectedXColumn}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Kolon seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {datasetSchema.map((col: { name: string; type: string }) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1">
                                              {col.type}
                                            </Badge>
                                            {col.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Y Ekseni (Değerler)</Label>
                                  <Select 
                                    value={selectedYColumn} 
                                    onValueChange={setSelectedYColumn}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Kolon seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {datasetSchema.map((col: { name: string; type: string }) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] px-1">
                                              {col.type}
                                            </Badge>
                                            {col.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Grafik Önizleme */}
                              {effectiveXColumn && effectiveYColumn && datasetPreviewData.length > 0 && (
                                <div className="rounded-lg border bg-muted/30 p-3">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Önizleme ({datasetPreviewData.length} satır)
                                  </p>
                                  <div className="h-32">
                                    <MiniChart
                                      type={formData.type}
                                      data={datasetPreviewData.slice(0, 20).map((row: Record<string, unknown>) => Number(row[effectiveYColumn]) || 0)}
                                      labels={datasetPreviewData.slice(0, 20).map((row: Record<string, unknown>) => String(row[effectiveXColumn] || ''))}
                                      height={120}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                  Bu veri setinde henüz veri bulunmuyor.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Herkese Açık</Label>
                <p className="text-sm text-muted-foreground">
                  Bu grafiği herkesin görüntülemesine izin ver
                </p>
              </div>
              <Switch
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleEdit}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grafiği Sil</DialogTitle>
            <DialogDescription>
              <strong>&quot;{selectedChart?.name}&quot;</strong> grafiğini silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Embed Kodu</DialogTitle>
            <DialogDescription>
              Bu grafiği web sitenize veya uygulamanıza gömün
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedChart?.is_public && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                <EyeOff className="h-4 w-4" />
                <span>Bu grafik özel. Embed çalışması için herkese açık yapın.</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Embed URL</Label>
              <div className="flex gap-2">
                <Input value={embedUrl} readOnly className="font-mono text-sm" />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(embedUrl, "url")}
                >
                  {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>iframe Kodu</Label>
              <div className="relative">
                <Textarea 
                  value={embedCode} 
                  readOnly 
                  rows={6}
                  className="font-mono text-sm resize-none"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCode, "code")}
                >
                  {copiedCode ? <Check className="mr-1 h-3 w-3 text-green-500" /> : <Copy className="mr-1 h-3 w-3" />}
                  {copiedCode ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={handleRegenerateEmbed}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Token Yenile
            </Button>
            <Button onClick={() => setEmbedDialogOpen(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
