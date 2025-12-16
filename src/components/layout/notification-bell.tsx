"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, notificationColors } from "@/hooks/use-notifications";
import type { Notification } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const colorClass = notificationColors[notification.type] || "bg-gray-500";
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString("tr-TR");
  };

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1 p-3 rounded-md transition-colors",
        notification.is_read 
          ? "opacity-60 hover:opacity-80" 
          : "bg-accent/50 hover:bg-accent"
      )}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn("h-2 w-2 rounded-full shrink-0", colorClass)} />
          <span className="font-medium text-sm truncate">{notification.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              title="Okundu olarak işaretle"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            title="Sil"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {notification.message && (
        <span className="text-xs text-muted-foreground pl-4 line-clamp-2">
          {notification.message}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground/70 pl-4">
        {formatTime(notification.created_at)}
      </span>
    </div>
  );
}

interface NotificationBellProps {
  /** Polling intervali (ms). Default: 30000 */
  pollingInterval?: number;
  /** Maksimum görüntülenen bildirim sayısı. Default: 10 */
  maxNotifications?: number;
  /** Tüm bildirimleri gör linkine tıklandığında çalışır */
  onViewAll?: () => void;
  /** Bildirime tıklandığında çalışır */
  onNotificationClick?: (notification: Notification) => void;
}

export function NotificationBell({
  pollingInterval = 30000,
  maxNotifications = 10,
  onViewAll,
  onNotificationClick,
}: NotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    hasNewNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    resetNewNotificationsFlag,
    refresh,
  } = useNotifications({
    pollingInterval,
    limit: maxNotifications,
    enableRealtime: true,
  });

  // Yeni bildirim geldiğinde animasyon göster
  useEffect(() => {
    if (hasNewNotifications) {
      // 2 saniye sonra animasyonu kaldır
      const timeout = setTimeout(() => {
        resetNewNotificationsFlag();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [hasNewNotifications, resetNewNotificationsFlag]);

  // Yeni bildirim geldiğinde pulse animasyonunu başlat
  const showPulse = hasNewNotifications;

  // Dropdown açıldığında animasyonu kaldır
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      resetNewNotificationsFlag();
    }
  }, [resetNewNotificationsFlag]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      router.push(notification.link);
    }
    
    onNotificationClick?.(notification);
  }, [markAsRead, router, onNotificationClick]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative transition-all duration-300",
            showPulse && "animate-pulse"
          )}
        >
          <Bell className={cn(
            "h-5 w-5 transition-all duration-300",
            showPulse && "text-primary animate-bounce"
          )} />
          
          {/* Okunmamış bildirim sayısı */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -right-1 -top-1 h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center",
                showPulse && "animate-ping"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          
          {/* Parlama efekti */}
          {showPulse && (
            <div className="absolute inset-0 rounded-md bg-primary/20 animate-pulse" />
          )}
          
          <span className="sr-only">Bildirimler</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="font-semibold">
            Bildirimler
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({unreadCount} okunmamış)
              </span>
            )}
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-1">
            {/* Yenile butonu */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refresh()}
              title="Yenile"
            >
              <Loader2 className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            
            {/* Tümünü okundu işaretle */}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => markAllAsRead()}
                title="Tümünü okundu işaretle"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            
            {/* Tümünü sil */}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteAllNotifications()}
                title="Tümünü sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Bildirim listesi */}
        <ScrollArea className="max-h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span className="text-sm">Henüz bildirim yok</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="cursor-pointer"
                >
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                onViewAll?.();
              }}
            >
              Tüm bildirimleri gör
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
