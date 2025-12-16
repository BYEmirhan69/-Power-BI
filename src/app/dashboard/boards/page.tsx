"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBoards } from "@/hooks/use-swr-data";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Copy,
  Globe,
  Lock,
  Star,
  Clock,
  Users as _Users,
  BarChart3,
  ArrowUpDown,
  Grid3X3,
  List,
  Share2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Settings,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs as _Tabs, TabsContent as _TabsContent, TabsList as _TabsList, TabsTrigger as _TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { Dashboard, Profile, DashboardChart } from "@/types/database.types";

interface BoardWithRelations extends Dashboard {
  profiles?: Profile | null;
  dashboard_charts?: DashboardChart[] | null;
}

interface _BoardStats {
  total: number;
  public: number;
  private: number;
  default: number;
}

interface _Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Yenileme aralığı seçenekleri
const refreshOptions = [
  { value: "", label: "Yok" },
  { value: "30", label: "30 saniye" },
  { value: "60", label: "1 dakika" },
  { value: "300", label: "5 dakika" },
  { value: "600", label: "10 dakika" },
  { value: "1800", label: "30 dakika" },
  { value: "3600", label: "1 saat" },
];

export default function BoardsPage() {
  const { profile, loading: authLoading } = useAuth();

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  // SWR ile boards'ları yükle
  const { 
    boards: rawBoards, 
    stats,
    pagination,
    isLoading: loading, 
    mutate: mutateBoards 
  } = useBoards({
    search: debouncedSearch || undefined,
    is_public: visibilityFilter === "public" ? "true" : visibilityFilter === "private" ? "false" : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    page,
    limit,
  });
  
  // Tip dönüşümü
  const boards = rawBoards as BoardWithRelations[];

  // Modal states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardWithRelations | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formRefreshInterval, setFormRefreshInterval] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form reset
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormIsPublic(false);
    setFormIsDefault(false);
    setFormRefreshInterval("");
  };

  // Board oluştur
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Hata", { description: "Board adı gerekli." });
      return;
    }

    setFormLoading(true);
    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_public: formIsPublic,
          is_default: formIsDefault,
          refresh_interval: formRefreshInterval ? parseInt(formRefreshInterval) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setCreateDialogOpen(false);
        resetForm();
        mutateBoards();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Oluşturma hatası:", error);
      toast.error("Hata", { description: "Board oluşturulamadı." });
    } finally {
      setFormLoading(false);
    }
  };

  // Board güncelle
  const handleUpdate = async () => {
    if (!selectedBoard || !formName.trim()) return;

    setFormLoading(true);
    try {
      const response = await fetch(`/api/boards/${selectedBoard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          is_public: formIsPublic,
          is_default: formIsDefault,
          refresh_interval: formRefreshInterval ? parseInt(formRefreshInterval) : null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setEditDialogOpen(false);
        setSelectedBoard(null);
        resetForm();
        mutateBoards();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      toast.error("Hata", { description: "Board güncellenemedi." });
    } finally {
      setFormLoading(false);
    }
  };

  // Board sil
  const handleDelete = async () => {
    if (!selectedBoard) return;

    setFormLoading(true);
    try {
      const response = await fetch(`/api/boards/${selectedBoard.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: data.message });
        setDeleteDialogOpen(false);
        setSelectedBoard(null);
        mutateBoards();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Silme hatası:", error);
      toast.error("Hata", { description: "Board silinemedi." });
    } finally {
      setFormLoading(false);
    }
  };

  // Düzenleme dialogunu aç
  const openEditDialog = (board: BoardWithRelations) => {
    setSelectedBoard(board);
    setFormName(board.name);
    setFormDescription(board.description || "");
    setFormIsPublic(board.is_public);
    setFormIsDefault(board.is_default);
    setFormRefreshInterval(board.refresh_interval?.toString() || "");
    setEditDialogOpen(true);
  };

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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return formatDate(dateString);
  };

  const getRefreshLabel = (interval: number | null) => {
    if (!interval) return "Yok";
    const option = refreshOptions.find((o) => o.value === interval.toString());
    return option?.label || `${interval} saniye`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
              <LayoutDashboard className="h-8 w-8" />
              Dashboard&apos;lar
            </h1>
            <p className="text-muted-foreground">
              Verilerinizi görselleştirmek için dashboard&apos;larınızı yönetin.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => mutateBoards()}>
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
                  Yeni Dashboard
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Yeni Dashboard Oluştur</DialogTitle>
                  <DialogDescription>
                    Verilerinizi görselleştirmek için yeni bir dashboard oluşturun.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Dashboard Adı *</Label>
                    <Input
                      id="name"
                      placeholder="Örn: Satış Analizi 2024"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      placeholder="Dashboard hakkında kısa bir açıklama..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refresh">Otomatik Yenileme</Label>
                    <Select value={formRefreshInterval} onValueChange={setFormRefreshInterval}>
                      <SelectTrigger>
                        <SelectValue placeholder="Yok" />
                      </SelectTrigger>
                      <SelectContent>
                        {refreshOptions.map((option) => (
                          <SelectItem key={option.value || "none"} value={option.value || "none"}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Herkese Açık</Label>
                      <p className="text-xs text-muted-foreground">
                        Link ile herkes görüntüleyebilir
                      </p>
                    </div>
                    <Switch
                      checked={formIsPublic}
                      onCheckedChange={setFormIsPublic}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Varsayılan Dashboard</Label>
                      <p className="text-xs text-muted-foreground">
                        Ana sayfada gösterilir
                      </p>
                    </div>
                    <Switch
                      checked={formIsDefault}
                      onCheckedChange={setFormIsDefault}
                    />
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
              <CardTitle className="text-sm font-medium">Toplam Dashboard</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.default} varsayılan
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Herkese Açık</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.public}</div>
              <p className="text-xs text-muted-foreground">Paylaşıma açık</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gizli</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.private}</div>
              <p className="text-xs text-muted-foreground">Sadece ekip erişebilir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grafik Sayısı</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {boards.reduce((acc, b) => acc + (b.dashboard_charts?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Tüm dashboard&apos;larda</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & View Toggle */}
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
                    placeholder="Dashboard ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Görünürlük" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="public">Herkese Açık</SelectItem>
                  <SelectItem value="private">Gizli</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sıralama" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at">Son Güncelleme</SelectItem>
                  <SelectItem value="created_at">Oluşturulma</SelectItem>
                  <SelectItem value="name">İsim</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Boards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="mb-2 text-muted-foreground">
                {searchQuery || visibilityFilter !== "all"
                  ? "Filtrelere uygun dashboard bulunamadı."
                  : "Henüz dashboard oluşturulmamış."}
              </p>
              {!searchQuery && visibilityFilter === "all" && (
                <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Dashboard&apos;u Oluştur
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card key={board.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="truncate">{board.name}</span>
                        {board.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {board.description || "Açıklama yok"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBoard(board);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detayları Gör
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(board)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Grafik Ekle
                        </DropdownMenuItem>
                        {board.is_public && (
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Paylaş
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedBoard(board);
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
                <CardContent className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={board.is_public ? "default" : "secondary"}>
                      {board.is_public ? (
                        <><Globe className="h-3 w-3 mr-1" />Açık</>
                      ) : (
                        <><Lock className="h-3 w-3 mr-1" />Gizli</>
                      )}
                    </Badge>
                    <Badge variant="outline">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      {board.dashboard_charts?.length || 0} grafik
                    </Badge>
                    <Badge variant="outline">
                      v{board.version}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={board.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(board.profiles?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[100px]">
                        {board.profiles?.full_name || "Bilinmiyor"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatRelativeTime(board.updated_at)}</span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dashboard</TableHead>
                      <TableHead>Görünürlük</TableHead>
                      <TableHead>Grafikler</TableHead>
                      <TableHead>Oluşturan</TableHead>
                      <TableHead>Güncelleme</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boards.map((board) => (
                      <TableRow key={board.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <LayoutDashboard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium flex items-center gap-2">
                                {board.name}
                                {board.is_default && (
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {board.description || "Açıklama yok"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={board.is_public ? "default" : "secondary"}>
                            {board.is_public ? (
                              <><Globe className="h-3 w-3 mr-1" />Açık</>
                            ) : (
                              <><Lock className="h-3 w-3 mr-1" />Gizli</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <span>{board.dashboard_charts?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={board.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(board.profiles?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {board.profiles?.full_name || "Bilinmiyor"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm cursor-default">
                                {formatRelativeTime(board.updated_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDate(board.updated_at)}
                            </TooltipContent>
                          </Tooltip>
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
                                  setSelectedBoard(board);
                                  setDetailDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Detayları Gör
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(board)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedBoard(board);
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
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Önceki
            </Button>
            <span className="text-sm text-muted-foreground">
              Sayfa {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              Sonraki
            </Button>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedBoard(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Dashboard&apos;u Düzenle</DialogTitle>
              <DialogDescription>
                {selectedBoard?.name} dashboard&apos;unun ayarlarını güncelleyin.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Dashboard Adı *</Label>
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
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-refresh">Otomatik Yenileme</Label>
                <Select
                  value={formRefreshInterval || "none"}
                  onValueChange={(v) => setFormRefreshInterval(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {refreshOptions.map((option) => (
                      <SelectItem key={option.value || "none"} value={option.value || "none"}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Herkese Açık</Label>
                  <p className="text-xs text-muted-foreground">
                    Link ile herkes görüntüleyebilir
                  </p>
                </div>
                <Switch
                  checked={formIsPublic}
                  onCheckedChange={setFormIsPublic}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Varsayılan Dashboard</Label>
                  <p className="text-xs text-muted-foreground">
                    Ana sayfada gösterilir
                  </p>
                </div>
                <Switch
                  checked={formIsDefault}
                  onCheckedChange={setFormIsDefault}
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
              <DialogTitle>Dashboard&apos;u Sil</DialogTitle>
              <DialogDescription>
                <strong>{selectedBoard?.name}</strong> dashboard&apos;unu silmek istediğinize emin misiniz?
                Bu işlem geri alınamaz ve içindeki tüm grafikler kaldırılacaktır.
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
                <LayoutDashboard className="h-5 w-5" />
                {selectedBoard?.name}
                {selectedBoard?.is_default && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
              </DialogTitle>
              <DialogDescription>
                Dashboard detayları ve ayarları
              </DialogDescription>
            </DialogHeader>

            {selectedBoard && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Görünürlük</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedBoard.is_public ? "default" : "secondary"}>
                        {selectedBoard.is_public ? (
                          <><Globe className="h-3 w-3 mr-1" />Herkese Açık</>
                        ) : (
                          <><Lock className="h-3 w-3 mr-1" />Gizli</>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Grafik Sayısı</Label>
                    <p className="font-medium">{selectedBoard.dashboard_charts?.length || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Versiyon</Label>
                    <p className="font-medium">v{selectedBoard.version}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Otomatik Yenileme</Label>
                    <p className="font-medium">{getRefreshLabel(selectedBoard.refresh_interval)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Oluşturulma</Label>
                    <p className="font-medium">{formatDate(selectedBoard.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Son Güncelleme</Label>
                    <p className="font-medium">{formatDate(selectedBoard.updated_at)}</p>
                  </div>
                </div>

                {selectedBoard.description && (
                  <div>
                    <Label className="text-muted-foreground">Açıklama</Label>
                    <p className="mt-1">{selectedBoard.description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground">Oluşturan</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedBoard.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(selectedBoard.profiles?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedBoard.profiles?.full_name || "Bilinmiyor"}</p>
                      <p className="text-xs text-muted-foreground">{selectedBoard.profiles?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Label className="text-muted-foreground">Dashboard ID:</Label>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{selectedBoard.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedBoard.id);
                      toast.success("ID kopyalandı");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {selectedBoard.is_public && selectedBoard.embed_token && (
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Embed URL:</Label>
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Önizle
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Kapat
              </Button>
              <Button onClick={() => {
                setDetailDialogOpen(false);
                if (selectedBoard) openEditDialog(selectedBoard);
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
