"use client";

import useSWR, { mutate } from "swr";
import type { SWRConfiguration } from "swr";

// Global fetcher fonksiyonu - geliştirilmiş hata yönetimi
const fetcher = async (url: string) => {
  try {
    const response = await fetch(url);
    
    // Tüm HTTP hatalarını sessizce handle et ve boş veri dön
    // Auth (401, 403), Not Found (404), diğer client/server hataları
    if (!response.ok) {
      return getEmptyResponse();
    }
    
    return response.json();
  } catch {
    // Network hatası - sessizce handle et
    return getEmptyResponse();
  }
};

// Boş response helper
const getEmptyResponse = () => ({
  datasets: [],
  charts: [],
  boards: [],
  reports: [],
  notifications: [],
  users: [],
  data: [],
  dataset: null,
  success: false,
});

// Varsayılan SWR ayarları - performans için optimize edilmiş
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Tab değişikliğinde otomatik yenileme kapalı
  revalidateOnReconnect: true, // İnternet bağlantısı geri gelince yenile
  dedupingInterval: 5000, // 5 saniye içinde aynı istek tekrarlanmaz
  errorRetryCount: 2, // Hata durumunda 2 kez dene
  errorRetryInterval: 10000, // Hata sonrası 10 saniye bekle
  shouldRetryOnError: false, // Fetcher artık hata fırlatmıyor, retry gerekli değil
  keepPreviousData: true, // Yeni veri gelene kadar eskiyi göster
};

// Dataset hook'u
export function useDatasets(options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    "/api/datasets",
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    datasets: data?.datasets || [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Charts hook'u
export function useCharts(params?: { type?: string; is_public?: string; search?: string }, options?: SWRConfiguration) {
  const searchParams = new URLSearchParams();
  if (params?.type && params.type !== "all") searchParams.set("type", params.type);
  if (params?.is_public) searchParams.set("is_public", params.is_public);
  if (params?.search) searchParams.set("search", params.search);
  
  const queryString = searchParams.toString();
  const url = `/api/charts${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    url,
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    charts: data?.charts || [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Single Dataset hook'u
export function useDataset(id: string | null, options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    id ? `/api/datasets/${id}` : null,
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    dataset: data?.dataset || null,
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Dataset Data hook'u (önizleme için)
export function useDatasetData(id: string | null, limit: number = 100, options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    id ? `/api/datasets/${id}/data?limit=${limit}` : null,
    fetcher,
    { 
      ...defaultConfig,
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 saniye cache
      ...options 
    }
  );

  return {
    data: data?.data || [],
    dataset: data?.dataset || null,
    pagination: data?.pagination || null,
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Reports hook'u
export function useReports(options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    "/api/reports",
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    reports: data?.reports || [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Dashboards (Boards) hook'u
export function useBoards(params?: { 
  search?: string;
  is_public?: string;
  sort_by?: string; 
  sort_order?: string; 
  page?: number; 
  limit?: number 
}, options?: SWRConfiguration) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.is_public) searchParams.set("is_public", params.is_public);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  
  const queryString = searchParams.toString();
  const url = `/api/boards${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    url,
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    boards: data?.boards || [],
    stats: data?.stats || { total: 0, public: 0, private: 0, default: 0 },
    pagination: data?.pagination || null,
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Data Sources hook'u
export function useDataSources(options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    "/api/data-sources",
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    dataSources: data?.dataSources || [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Notifications hook'u (polling ile)
export function useNotificationsSWR(limit: number = 10, options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    `/api/notifications?limit=${limit}`,
    fetcher,
    { 
      ...defaultConfig,
      refreshInterval: 60000, // 60 saniyede bir yenile (30'dan 60'a çıkarıldı)
      revalidateOnFocus: true, // Tab'a dönünce yenile
      dedupingInterval: 10000, // 10 saniye dedup
      ...options 
    }
  );

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Activity Logs hook'u
export function useActivityLogs(
  params?: { page?: number; pageSize?: number; action?: string; entity?: string; date?: string; search?: string },
  options?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.action && params.action !== "all") searchParams.set("action", params.action);
  if (params?.entity && params.entity !== "all") searchParams.set("entity", params.entity);
  if (params?.date && params.date !== "all") searchParams.set("date", params.date);
  if (params?.search) searchParams.set("search", params.search);
  
  const queryString = searchParams.toString();
  const url = `/api/activity${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    url,
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    activities: data?.activities || [],
    totalCount: data?.totalCount || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Users hook'u
export function useUsers(options?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR(
    "/api/users",
    fetcher,
    { ...defaultConfig, ...options }
  );

  return {
    users: data?.users || [],
    isLoading,
    isValidating,
    error,
    mutate: revalidate,
  };
}

// Global mutate fonksiyonu - cache'i temizlemek için
export { mutate };

// Belirli bir endpoint'in cache'ini temizle
export function invalidateCache(key: string | RegExp) {
  if (typeof key === "string") {
    mutate(key);
  } else {
    // Regex ile eşleşen tüm cache'leri temizle
    mutate(
      (currentKey) => typeof currentKey === "string" && key.test(currentKey),
      undefined,
      { revalidate: true }
    );
  }
}

// Tüm cache'i temizle
export function clearAllCache() {
  mutate(() => true, undefined, { revalidate: false });
}
