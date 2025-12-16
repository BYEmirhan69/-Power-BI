"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global fetcher - tüm hataları sessizce handle et
        fetcher: async (url: string) => {
          try {
            const response = await fetch(url);
            
            // Tüm HTTP hatalarını sessizce handle et ve boş veri dön
            if (!response.ok) {
              return getEmptyResponse();
            }
            
            return response.json();
          } catch {
            // Network hatası - sessizce handle et
            return getEmptyResponse();
          }
        },
        // Performans ayarları
        revalidateOnFocus: false, // Tab değişikliğinde yenileme kapalı
        revalidateOnReconnect: true,
        dedupingInterval: 5000, // 5 saniye dedup
        errorRetryCount: 2,
        errorRetryInterval: 10000,
        keepPreviousData: true, // Eski veriyi göster (smooth UX)
        suspense: false,
        shouldRetryOnError: false, // Fetcher artık hata fırlatmıyor
      }}
    >
      {children}
    </SWRConfig>
  );
}

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

export default SWRProvider;
