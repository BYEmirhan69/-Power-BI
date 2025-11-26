"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  MoreVertical,
  Calendar,
  RefreshCw,
  Edit,
  Eye,
  Database,
  Table2,
  Upload,
  Loader2,
  AlertCircle,
  Hash,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  Layers,
  ExternalLink,
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
import { Progress } from "@/components/ui/progress";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { Dataset, DataCategory, DataSourceType, Json } from "@/types/database.types";

interface DatasetWithRelations extends Dataset {
  data_source?: {
    id: string;
    name: string;
    type: DataSourceType;
  } | null;
  creator?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface SchemaColumn {
  name: string;
  type: string;
}

const categoryLabels: Record<DataCategory, string> = {
  time_series: "Zaman Serisi",
  behavioral: "Davranışsal",
  technological: "Teknolojik",
  financial: "Finansal",
  other: "Diğer",
};

const categoryIcons: Record<DataCategory, React.ReactNode> = {
  time_series: <Clock className="h-4 w-4" />,
  behavioral: <TrendingUp className="h-4 w-4" />,
  technological: <Database className="h-4 w-4" />,
  financial: <DollarSign className="h-4 w-4" />,
  other: <Layers className="h-4 w-4" />,
};

const categoryColors: Record<DataCategory, string> = {
  time_series: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  behavioral: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  technological: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  financial: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const typeLabels: Record<string, string> = {
  csv: "CSV",
  excel: "Excel",
  api: "API",
  scraping: "Web Scraping",
  manual: "Manuel",
};

const typeColors: Record<string, string> = {
  csv: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  excel: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  api: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  scraping: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  manual: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function DatasetsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  // State
  const [datasets, setDatasets] = useState<DatasetWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DatasetWithRelations | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<DataCategory>("other");

  // Dataset'leri yükle
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/datasets");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dataset'ler yüklenemedi");
      }

      setDatasets(data.datasets || []);
    } catch (error) {
      console.error("Dataset'ler yüklenirken hata:", error);
      toast.error("Dataset'ler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && profile) {
      fetchDatasets();
    }
  }, [user, profile, fetchDatasets]);

  // Form sıfırla
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCategory("other");
    setSelectedDataset(null);
  };

  // Dataset güncelle
  const handleEditDataset = async () => {
    if (!selectedDataset || !formName.trim()) {
      toast.error("Dataset adı gerekli");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/datasets/${selectedDataset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          category: formCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dataset güncellenemedi");
      }

      toast.success("Dataset başarıyla güncellendi");
      setEditDialogOpen(false);
      resetForm();
      fetchDatasets();
    } catch (error: unknown) {
      console.error("Dataset güncellenirken hata:", error);
      toast.error(error instanceof Error ? error.message : "Dataset güncellenemedi");
    } finally {
      setActionLoading(false);
    }
  };

  // Dataset sil
  const handleDeleteDataset = async () => {
    if (!selectedDataset) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/datasets/${selectedDataset.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dataset silinemedi");
      }

      toast.success("Dataset başarıyla silindi");
      setDeleteDialogOpen(false);
      setSelectedDataset(null);
      fetchDatasets();
    } catch (error: unknown) {
      console.error("Dataset silinirken hata:", error);
      toast.error(error instanceof Error ? error.message : "Dataset silinemedi");
    } finally {
      setActionLoading(false);
    }
  };

  // Düzenleme modalını aç
  const openEditDialog = (dataset: DatasetWithRelations) => {
    setSelectedDataset(dataset);
    setFormName(dataset.name);
    setFormDescription(dataset.description || "");
    setFormCategory(dataset.category || "other");
    setEditDialogOpen(true);
  };

  // Detay modalını aç
  const openDetailDialog = (dataset: DatasetWithRelations) => {
    setSelectedDataset(dataset);
    setDetailDialogOpen(true);
  };

  // Schema'yı parse et
  const parseSchema = (schema: Json): SchemaColumn[] => {
    if (!schema) return [];
    if (Array.isArray(schema)) {
      return schema as unknown as SchemaColumn[];
    }
    return [];
  };

  // Filtrelenmiş dataset'ler
  const filteredDatasets = datasets.filter((dataset) => {
    const matchesSearch =
      dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || dataset.category === filterCategory;
    const matchesType = filterType === "all" || dataset.type === filterType;

    return matchesSearch && matchesCategory && matchesType;
  });

  // İstatistikler
  const stats = {
    total: datasets.length,
    totalRows: datasets.reduce((acc, d) => acc + (d.row_count || 0), 0),
    categories: {
      time_series: datasets.filter((d) => d.category === "time_series").length,
      financial: datasets.filter((d) => d.category === "financial").length,
      behavioral: datasets.filter((d) => d.category === "behavioral").length,
      technological: datasets.filter((d) => d.category === "technological").length,
    },
  };

  // Tarih formatlama
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Sayı formatlama
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("tr-TR").format(num);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Veri Setleri
          </h1>
          <p className="text-muted-foreground">
            Verilerinizi yönetin, analiz edin ve görselleştirmeler için kullanın
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/data-import")}>
          <Upload className="h-4 w-4 mr-2" />
          Veri İçe Aktar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.total}</div>
              <Database className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Satır
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatNumber(stats.totalRows)}</div>
              <Table2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Finansal Veri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{stats.categories.financial}</div>
              <DollarSign className="h-8 w-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zaman Serisi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">{stats.categories.time_series}</div>
              <Clock className="h-8 w-8 text-blue-600/50" />
            </div>
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
                placeholder="Dataset ara..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                <SelectItem value="time_series">Zaman Serisi</SelectItem>
                <SelectItem value="financial">Finansal</SelectItem>
                <SelectItem value="behavioral">Davranışsal</SelectItem>
                <SelectItem value="technological">Teknolojik</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Kaynak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="scraping">Web Scraping</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid Görünümü</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "table" ? "default" : "outline"}
                      size="icon"
                      onClick={() => setViewMode("table")}
                    >
                      <Table2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tablo Görünümü</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={fetchDatasets}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Yenile</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredDatasets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Dataset Bulunamadı</h3>
            <p className="text-muted-foreground mt-1">
              {searchQuery || filterCategory !== "all" || filterType !== "all"
                ? "Arama kriterlerinize uygun dataset bulunamadı"
                : "Henüz dataset oluşturmadınız. Veri içe aktararak başlayın."}
            </p>
            {!searchQuery && filterCategory === "all" && filterType === "all" && (
              <Button className="mt-4" onClick={() => router.push("/dashboard/data-import")}>
                <Upload className="h-4 w-4 mr-2" />
                Veri İçe Aktar
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => {
            const schema = parseSchema(dataset.schema);
            return (
              <Card
                key={dataset.id}
                className="group hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetailDialog(dataset)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{dataset.name}</CardTitle>
                      {dataset.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {dataset.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailDialog(dataset); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Detaylar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(dataset); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDataset(dataset);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className={categoryColors[dataset.category || "other"]}>
                        {categoryIcons[dataset.category || "other"]}
                        <span className="ml-1">{categoryLabels[dataset.category || "other"]}</span>
                      </Badge>
                      <Badge variant="outline" className={typeColors[dataset.type] || typeColors.manual}>
                        {typeLabels[dataset.type] || dataset.type}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{formatNumber(dataset.row_count)} satır</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Table2 className="h-3 w-3" />
                        <span>{schema.length} kolon</span>
                      </div>
                    </div>

                    {/* Schema Preview */}
                    {schema.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {schema.slice(0, 4).map((col, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {col.name}
                          </Badge>
                        ))}
                        {schema.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{schema.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(dataset.created_at)}
                      </div>
                      {dataset.creator && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={dataset.creator.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {dataset.creator.full_name?.[0] || dataset.creator.email[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[80px]">
                            {dataset.creator.full_name || dataset.creator.email.split("@")[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Table View
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead className="text-right">Satır</TableHead>
                    <TableHead className="text-right">Kolon</TableHead>
                    <TableHead>Oluşturan</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDatasets.map((dataset) => {
                    const schema = parseSchema(dataset.schema);
                    return (
                      <TableRow key={dataset.id} className="cursor-pointer" onClick={() => openDetailDialog(dataset)}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{dataset.name}</span>
                            {dataset.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {dataset.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={categoryColors[dataset.category || "other"]}>
                            {categoryLabels[dataset.category || "other"]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={typeColors[dataset.type] || typeColors.manual}>
                            {typeLabels[dataset.type] || dataset.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(dataset.row_count)}</TableCell>
                        <TableCell className="text-right">{schema.length}</TableCell>
                        <TableCell>
                          {dataset.creator && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={dataset.creator.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {dataset.creator.full_name?.[0] || dataset.creator.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[100px]">
                                {dataset.creator.full_name || dataset.creator.email.split("@")[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(dataset.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailDialog(dataset); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                Detaylar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(dataset); }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDataset(dataset);
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {selectedDataset?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDataset?.description || "Dataset detayları"}
            </DialogDescription>
          </DialogHeader>
          {selectedDataset && (
            <div className="space-y-4">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Kategori</Label>
                  <div>
                    <Badge variant="secondary" className={categoryColors[selectedDataset.category || "other"]}>
                      {categoryIcons[selectedDataset.category || "other"]}
                      <span className="ml-1">{categoryLabels[selectedDataset.category || "other"]}</span>
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Kaynak Tipi</Label>
                  <div>
                    <Badge variant="outline" className={typeColors[selectedDataset.type] || typeColors.manual}>
                      {typeLabels[selectedDataset.type] || selectedDataset.type}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Satır Sayısı</Label>
                  <p className="font-medium">{formatNumber(selectedDataset.row_count)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Kolon Sayısı</Label>
                  <p className="font-medium">{parseSchema(selectedDataset.schema).length}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Oluşturulma</Label>
                  <p className="font-medium">{formatDate(selectedDataset.created_at)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Son Güncelleme</Label>
                  <p className="font-medium">{formatDate(selectedDataset.updated_at)}</p>
                </div>
              </div>

              {/* Data Source */}
              {selectedDataset.data_source && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Veri Kaynağı</Label>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>{selectedDataset.data_source.name}</span>
                    <Badge variant="outline">{selectedDataset.data_source.type}</Badge>
                  </div>
                </div>
              )}

              {/* Schema */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Şema (Kolonlar)</Label>
                <ScrollArea className="h-[200px] rounded-md border p-3">
                  <div className="space-y-2">
                    {parseSchema(selectedDataset.schema).map((col, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-6">{idx + 1}.</span>
                          <span className="font-medium">{col.name}</span>
                        </div>
                        <Badge variant="outline">{col.type}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Creator */}
              {selectedDataset.creator && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Avatar>
                    <AvatarImage src={selectedDataset.creator.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedDataset.creator.full_name?.[0] || selectedDataset.creator.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedDataset.creator.full_name || "İsimsiz"}</p>
                    <p className="text-sm text-muted-foreground">{selectedDataset.creator.email}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Kapat
            </Button>
            <Button onClick={() => { setDetailDialogOpen(false); openEditDialog(selectedDataset!); }}>
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dataset Düzenle</DialogTitle>
            <DialogDescription>
              Dataset bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Dataset Adı *</Label>
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
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as DataCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_series">Zaman Serisi</SelectItem>
                  <SelectItem value="financial">Finansal</SelectItem>
                  <SelectItem value="behavioral">Davranışsal</SelectItem>
                  <SelectItem value="technological">Teknolojik</SelectItem>
                  <SelectItem value="other">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleEditDataset} disabled={actionLoading}>
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
            <DialogTitle>Dataset Sil</DialogTitle>
            <DialogDescription>
              <strong>{selectedDataset?.name}</strong> dataset&apos;ini silmek istediğinizden emin misiniz?
              Bu işlem geri alınabilir ancak bu dataset&apos;e bağlı tüm grafikler de etkilenecektir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteDataset} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
