"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  MoreVertical,
  Search,
  Clock,
  Check,
  X,
  RefreshCw,
  Copy,
  Loader2,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

import type { Profile, UserRole, Invitation, InvitationStatus } from "@/types/database.types";

interface InvitationWithProfile extends Invitation {
  invited_by_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Yönetici",
  user: "Kullanıcı",
  developer: "Geliştirici",
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  developer: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const statusLabels: Record<InvitationStatus, string> = {
  pending: "Bekliyor",
  accepted: "Kabul Edildi",
  expired: "Süresi Doldu",
  revoked: "İptal Edildi",
};

const statusColors: Record<InvitationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  accepted: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  revoked: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function UsersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const _supabase = createClient();  

  // State
  const [users, setUsers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("user");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [roleLoading, setRoleLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Kullanıcıları getir
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        if (response.status === 403) {
          toast.error("Yetkisiz Erişim", {
            description: "Bu sayfaya erişim için admin yetkisi gerekli.",
          });
        } else {
          toast.error("Hata", { description: errorData.error });
        }
      }
    } catch (error) {
      console.error("Kullanıcılar getirilemedi:", error);
      toast.error("Hata", { description: "Kullanıcılar yüklenirken bir hata oluştu." });
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Davetleri getir
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch("/api/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Davetler getirilemedi:", error);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    if (user && profile?.role === "admin") {
      fetchUsers();
      fetchInvitations();
    } else if (profile && profile.role !== "admin") {
      setUsersLoading(false);
      setInvitationsLoading(false);
    }
  }, [user, profile, fetchUsers, fetchInvitations]);

  // Davet gönder
  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Hata", { description: "E-posta adresi gerekli." });
      return;
    }

    setInviteLoading(true);
    setInviteLink(null);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteLink(data.inviteLink);
        toast.success("Davet Oluşturuldu", {
          description: "Davet linki oluşturuldu. Kullanıcıya gönderin.",
        });
        fetchInvitations();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Davet hatası:", error);
      toast.error("Hata", { description: "Davet gönderilirken bir hata oluştu." });
    } finally {
      setInviteLoading(false);
    }
  };

  // Davet linkini kopyala
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Kopyalandı", { description: "Davet linki panoya kopyalandı." });
    }
  };

  // Rol değiştir
  const handleRoleChange = async () => {
    if (!selectedUser) return;

    setRoleLoading(true);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast.success("Başarılı", {
          description: `${selectedUser.full_name || selectedUser.email} kullanıcısının rolü güncellendi.`,
        });
        fetchUsers();
        setRoleDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Rol güncelleme hatası:", error);
      toast.error("Hata", { description: "Rol güncellenirken bir hata oluştu." });
    } finally {
      setRoleLoading(false);
    }
  };

  // Kullanıcıyı çıkar
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Başarılı", {
          description: `${userToDelete.full_name || userToDelete.email} organizasyondan çıkarıldı.`,
        });
        fetchUsers();
        setDeleteDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Kullanıcı çıkarma hatası:", error);
      toast.error("Hata", { description: "Kullanıcı çıkarılırken bir hata oluştu." });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Daveti iptal et
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Başarılı", { description: "Davet iptal edildi." });
        fetchInvitations();
      } else {
        const data = await response.json();
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Davet iptal hatası:", error);
      toast.error("Hata", { description: "Davet iptal edilirken bir hata oluştu." });
    }
  };

  // Daveti yeniden gönder
  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Başarılı", { description: "Davet yenilendi." });
        // Yeni linki göster
        if (data.inviteLink) {
          navigator.clipboard.writeText(data.inviteLink);
          toast.info("Link Kopyalandı", { description: "Yeni davet linki panoya kopyalandı." });
        }
        fetchInvitations();
      } else {
        toast.error("Hata", { description: data.error });
      }
    } catch (error) {
      console.error("Davet yenileme hatası:", error);
      toast.error("Hata", { description: "Davet yenilenirken bir hata oluştu." });
    }
  };

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pending davetler
  const pendingInvitations = invitations.filter((i) => i.status === "pending");

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
    return email.charAt(0).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Yükleniyor durumu
  if (authLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Yetki kontrolü
  if (!profile || profile.role !== "admin") {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Yetkisiz Erişim</h2>
            <p className="text-muted-foreground text-center">
              Bu sayfaya erişim için yönetici yetkisi gereklidir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-muted-foreground">
              Organizasyonunuzdaki kullanıcıları ve davetleri yönetin.
            </p>
          </div>

          <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
            setInviteDialogOpen(open);
            if (!open) {
              setInviteEmail("");
              setInviteRole("user");
              setInviteLink(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Kullanıcı Davet Et
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kullanıcı Davet Et</DialogTitle>
                <DialogDescription>
                  Organizasyonunuza yeni bir kullanıcı davet edin.
                </DialogDescription>
              </DialogHeader>

              {!inviteLink ? (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta Adresi</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Kullanıcı</SelectItem>
                        <SelectItem value="developer">Geliştirici</SelectItem>
                        <SelectItem value="admin">Yönetici</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteRole === "admin" && "Yöneticiler tüm ayarlara erişebilir."}
                      {inviteRole === "developer" && "Geliştiriciler API erişimine sahiptir."}
                      {inviteRole === "user" && "Kullanıcılar temel işlemleri yapabilir."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Davet başarıyla oluşturuldu!
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Davet Linki</Label>
                    <div className="flex gap-2">
                      <Input
                        value={inviteLink}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={copyInviteLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bu linki davet ettiğiniz kullanıcıya gönderin. Link 7 gün geçerlidir.
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Not:</strong> Supabase&apos;in dahili e-posta sunucusu sadece proje ekibine 
                      e-posta gönderebilir. Üretim ortamı için özel SMTP yapılandırması gerekir.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {!inviteLink ? (
                  <Button onClick={handleInvite} disabled={inviteLoading}>
                    {inviteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Davet Gönder
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Kapat
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Toplam Kullanıcı</CardDescription>
              <CardTitle className="text-3xl">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Yönetici</CardDescription>
              <CardTitle className="text-3xl">
                {users.filter((u) => u.role === "admin").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Bekleyen Davet</CardDescription>
              <CardTitle className="text-3xl">{pendingInvitations.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Kullanıcılar ({users.length})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Davetler ({pendingInvitations.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Kullanıcı Listesi</CardTitle>
                    <CardDescription>
                      Organizasyonunuzdaki tüm kullanıcılar.
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Kullanıcı ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Aramanızla eşleşen kullanıcı bulunamadı." : "Henüz kullanıcı yok."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Katılım Tarihi</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(u.full_name, u.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {u.full_name || "İsimsiz Kullanıcı"}
                                  {u.id === user?.id && (
                                    <span className="text-xs text-muted-foreground ml-2">(Siz)</span>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[u.role]} variant="secondary">
                              {roleLabels[u.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(u.created_at)}</TableCell>
                          <TableCell className="text-right">
                            {u.id !== user?.id && (
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
                                      setSelectedUser(u);
                                      setNewRole(u.role);
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Rol Değiştir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setUserToDelete(u);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Organizasyondan Çıkar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Davet Listesi</CardTitle>
                <CardDescription>
                  Gönderilen tüm davetleri görüntüleyin ve yönetin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz davet gönderilmemiş.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-posta</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Davet Eden</TableHead>
                        <TableHead>Geçerlilik</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {invitation.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[invitation.role]} variant="secondary">
                              {roleLabels[invitation.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[invitation.status]} variant="secondary">
                              {invitation.status === "pending" && isExpired(invitation.expires_at)
                                ? "Süresi Doldu"
                                : statusLabels[invitation.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invitation.invited_by_profile?.full_name || 
                             invitation.invited_by_profile?.email || 
                             "Bilinmiyor"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDate(invitation.expires_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {invitation.status === "pending" && (
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleResendInvitation(invitation.id)}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Yeniden Gönder</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => handleRevokeInvitation(invitation.id)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>İptal Et</TooltipContent>
                                </Tooltip>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Change Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rol Değiştir</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name || selectedUser?.email} kullanıcısının rolünü değiştirin.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="newRole">Yeni Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="developer">Geliştirici</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleRoleChange} disabled={roleLoading}>
                {roleLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kullanıcıyı Çıkar</DialogTitle>
              <DialogDescription>
                <strong>{userToDelete?.full_name || userToDelete?.email}</strong> kullanıcısını
                organizasyondan çıkarmak istediğinize emin misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                İptal
              </Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteLoading}>
                {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Çıkar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
