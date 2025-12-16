"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationType } from "@/types/database.types";

// Bildirim tipine göre renk eşleşmesi
export const notificationColors: Record<NotificationType, string> = {
  info: "bg-blue-500",
  success: "bg-green-500",
  warning: "bg-orange-500",
  error: "bg-red-500",
};

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  hasNewNotifications: boolean;
}

export interface UseNotificationsOptions {
  /** Polling intervali (ms). Default: 60000 (60 saniye) */
  pollingInterval?: number;
  /** Otomatik polling başlat. Default: true */
  autoStart?: boolean;
  /** Maksimum bildirim sayısı. Default: 10 */
  limit?: number;
  /** Realtime subscription aktif mi? Default: true */
  enableRealtime?: boolean;
}

export interface UseNotificationsReturn extends NotificationState {
  /** Bildirimleri manuel olarak yenile */
  refresh: () => Promise<void>;
  /** Belirli bir bildirimi okundu olarak işaretle */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Tüm bildirimleri okundu olarak işaretle */
  markAllAsRead: () => Promise<void>;
  /** Belirli bir bildirimi sil */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Tüm bildirimleri sil */
  deleteAllNotifications: () => Promise<void>;
  /** Polling'i başlat */
  startPolling: () => void;
  /** Polling'i durdur */
  stopPolling: () => void;
  /** Yeni bildirim bayrağını sıfırla */
  resetNewNotificationsFlag: () => void;
}

const DEFAULT_OPTIONS: Required<UseNotificationsOptions> = {
  pollingInterval: 60000, // 60 saniye - performans için artırıldı
  autoStart: true,
  limit: 10,
  enableRealtime: true,
};

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { pollingInterval, autoStart, limit, enableRealtime } = mergedOptions;

  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
    error: null,
    lastUpdated: null,
    hasNewNotifications: false,
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();
  const previousUnreadCountRef = useRef<number>(0);

  // API'den bildirimleri al
  const fetchNotifications = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      const params = new URLSearchParams({ limit: limit.toString() });
      
      const response = await fetch(`/api/notifications?${params}`);
      
      if (!response.ok) {
        throw new Error("Bildirimler alınamadı");
      }

      const data = await response.json();
      const { notifications, unreadCount, timestamp } = data;

      setState(prev => {
        // Yeni bildirim geldi mi kontrol et
        const hasNew = previousUnreadCountRef.current > 0 && 
                       unreadCount > previousUnreadCountRef.current;
        
        previousUnreadCountRef.current = unreadCount;

        return {
          ...prev,
          notifications: notifications || [],
          unreadCount: unreadCount || 0,
          isLoading: false,
          error: null,
          lastUpdated: timestamp,
          hasNewNotifications: hasNew || prev.hasNewNotifications,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      }));
    }
  }, [limit]);

  // Bildirimi okundu olarak işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error("Bildirim güncellenemedi");
      }

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      console.error("markAsRead hatası:", error);
    }
  }, []);

  // Tüm bildirimleri okundu olarak işaretle
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) {
        throw new Error("Bildirimler güncellenemedi");
      }

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("markAllAsRead hatası:", error);
    }
  }, []);

  // Belirli bir bildirimi sil
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error("Bildirim silinemedi");
      }

      setState(prev => {
        const deletedNotification = prev.notifications.find(n => n.id === notificationId);
        const wasUnread = deletedNotification && !deletedNotification.is_read;

        return {
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });
    } catch (error) {
      console.error("deleteNotification hatası:", error);
    }
  }, []);

  // Tüm bildirimleri sil
  const deleteAllNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });

      if (!response.ok) {
        throw new Error("Bildirimler silinemedi");
      }

      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0,
      }));
    } catch (error) {
      console.error("deleteAllNotifications hatası:", error);
    }
  }, []);

  // Polling başlat
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(() => {
      fetchNotifications(false);
    }, pollingInterval);
  }, [fetchNotifications, pollingInterval]);

  // Polling durdur
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Manuel yenileme
  const refresh = useCallback(async () => {
    await fetchNotifications(true);
  }, [fetchNotifications]);

  // Yeni bildirim bayrağını sıfırla
  const resetNewNotificationsFlag = useCallback(() => {
    setState(prev => ({ ...prev, hasNewNotifications: false }));
  }, []);

  // İlk yükleme ve polling başlat
  useEffect(() => {
    fetchNotifications(true);

    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [fetchNotifications, autoStart, startPolling, stopPolling]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          setState(prev => {
            // Zaten var mı kontrol et
            if (prev.notifications.some(n => n.id === newNotification.id)) {
              return prev;
            }

            return {
              ...prev,
              notifications: [newNotification, ...prev.notifications].slice(0, limit),
              unreadCount: prev.unreadCount + 1,
              hasNewNotifications: true,
            };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          setState(prev => ({
            ...prev,
            notifications: prev.notifications.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            ),
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const deletedId = payload.old.id as string;
          
          setState(prev => ({
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== deletedId),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, enableRealtime, limit]);

  // Sayfa görünürlük değişikliklerini dinle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Sayfa tekrar görünür olduğunda bildirimleri yenile
        fetchNotifications(false);
        
        if (autoStart && !pollingRef.current) {
          startPolling();
        }
      } else {
        // Sayfa gizli olduğunda polling'i durdur (opsiyonel)
        // stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications, autoStart, startPolling]);

  return {
    ...state,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    startPolling,
    stopPolling,
    resetNewNotificationsFlag,
  };
}

export default useNotifications;
