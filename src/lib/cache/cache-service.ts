/**
 * Cache Service
 * Grafik önbellekleme, query cache, dashboard cache
 * Time-based ve data-based cache invalidation
 */

import { createClient } from "@/lib/supabase/client";
import type { Json, Database } from "@/types/database.types";

// =============================================
// Types
// =============================================

export interface CacheEntry<T = unknown> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheOptions {
  ttlSeconds?: number;
  forceRefresh?: boolean;
}

export interface ChartCacheKey {
  chartId: string;
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  avgAge: number;
  memoryUsage: number;
}

// =============================================
// In-Memory Cache (Client-side)
// =============================================

class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100;
  private hits = 0;
  private misses = 0;

  /**
   * Cache'den veri al
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    this.hits++;
    return entry.data as T;
  }

  /**
   * Cache'e veri ekle
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // LRU eviction - max size aşılırsa en eski girdiyi sil
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
      hitCount: 0,
    });
  }

  /**
   * Belirli key'i sil
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Pattern'e göre sil (wildcard destekli)
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Tüm cache'i temizle
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * İstatistikleri getir
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    return {
      totalEntries: this.cache.size,
      hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      avgAge:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + (now - e.cachedAt), 0) / entries.length / 1000
          : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, value] of this.cache.entries()) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(value.data).length * 2;
    }
    return size;
  }
}

// Global memory cache instance
const memoryCache = new MemoryCache();

// =============================================
// Chart Cache Service (Database-backed)
// =============================================

export class ChartCacheService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * Chart cache key oluştur
   */
  private createCacheKey(params: ChartCacheKey): string {
    const parts = [params.chartId];

    if (params.filters) {
      parts.push(JSON.stringify(params.filters));
    }

    if (params.dateRange) {
      parts.push(`${params.dateRange.start}-${params.dateRange.end}`);
    }

    return parts.join(":");
  }

  /**
   * Chart verisini cache'den al veya hesapla
   */
  async getOrCompute<T>(
    params: ChartCacheKey,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<{ data: T; cached: boolean }> {
    const { ttlSeconds = 3600, forceRefresh = false } = options;
    const cacheKey = this.createCacheKey(params);

    // Force refresh değilse önce memory cache'e bak
    if (!forceRefresh) {
      const memCached = memoryCache.get<T>(cacheKey);
      if (memCached !== null) {
        return { data: memCached, cached: true };
      }

      // Database cache'e bak
      const { data: dbCached } = await this.supabase.rpc("get_or_set_chart_cache", {
        p_chart_id: params.chartId,
        p_cache_key: cacheKey,
        p_data: null,
        p_ttl_seconds: ttlSeconds,
      });

      const cacheResult = dbCached as { hit: boolean; data: Json | null } | null;
      if (cacheResult?.hit && cacheResult?.data) {
        // Memory cache'e de ekle
        memoryCache.set(cacheKey, cacheResult.data, ttlSeconds);
        return { data: cacheResult.data as T, cached: true };
      }
    }

    // Cache miss - compute
    const data = await computeFn();

    // Her iki cache'e de kaydet
    memoryCache.set(cacheKey, data, ttlSeconds);

    await this.supabase.rpc("get_or_set_chart_cache", {
      p_chart_id: params.chartId,
      p_cache_key: cacheKey,
      p_data: data as Json,
      p_ttl_seconds: ttlSeconds,
    });

    return { data, cached: false };
  }

  /**
   * Chart cache'ini invalidate et
   */
  async invalidate(chartId: string, reason: string = "manual"): Promise<number> {
    // Memory cache'i temizle
    const memDeleted = memoryCache.deletePattern(`${chartId}:*`);

    // Database cache'i temizle
    const { data } = await this.supabase.rpc("invalidate_chart_cache", {
      p_chart_id: chartId,
      p_reason: reason,
    });

    return ((data as number | null) ?? 0) + memDeleted;
  }

  /**
   * Dataset değişikliğinde ilgili tüm chart cache'lerini invalidate et
   */
  async invalidateByDataset(datasetId: string, reason: string = "data_update"): Promise<number> {
    const { data } = await this.supabase.rpc("invalidate_dataset_caches", {
      p_dataset_id: datasetId,
      p_reason: reason,
    });

    // Memory cache'i de temizle (chart ID'lerini bilmediğimiz için tümünü temizle)
    memoryCache.clear();

    return (data as number | null) ?? 0;
  }
}

// =============================================
// Query Cache Service
// =============================================

export class QueryCacheService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * Query hash oluştur
   */
  private hashQuery(query: string): string {
    // Simple hash function for demo - production'da crypto.subtle.digest kullanın
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cached query sonucu al
   */
  async getCachedQuery<T>(
    organizationId: string,
    query: string
  ): Promise<{ data: T; cached: boolean } | null> {
    const queryHash = this.hashQuery(query);
    const cacheKey = `query:${organizationId}:${queryHash}`;

    // Memory cache kontrolü
    const memCached = memoryCache.get<T>(cacheKey);
    if (memCached !== null) {
      return { data: memCached, cached: true };
    }

    // Database cache kontrolü
    const { data, error } = await this.supabase
      .from("query_cache")
      .select("result")
      .eq("organization_id", organizationId)
      .eq("query_hash", queryHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Memory cache'e ekle
    memoryCache.set(cacheKey, data.result, 300);

    return { data: data.result as T, cached: true };
  }

  /**
   * Query sonucunu cache'e kaydet
   */
  async cacheQuery<T>(
    organizationId: string,
    query: string,
    result: T,
    options: { ttlSeconds?: number; rowCount?: number; executionTimeMs?: number } = {}
  ): Promise<void> {
    const { ttlSeconds = 3600, rowCount, executionTimeMs } = options;
    const queryHash = this.hashQuery(query);
    const cacheKey = `query:${organizationId}:${queryHash}`;

    // Memory cache'e ekle
    memoryCache.set(cacheKey, result, ttlSeconds);

    // Database cache'e ekle
    await this.supabase.from("query_cache").upsert({
      organization_id: organizationId,
      query_hash: queryHash,
      query_text: query,
      result: result as Json,
      row_count: rowCount,
      execution_time_ms: executionTimeMs,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    } as Database["public"]["Tables"]["query_cache"]["Insert"]);
  }

  /**
   * Organization query cache'ini temizle
   */
  async clearOrganizationCache(organizationId: string): Promise<void> {
    memoryCache.deletePattern(`query:${organizationId}:*`);

    await this.supabase.from("query_cache").delete().eq("organization_id", organizationId);
  }
}

// =============================================
// Dashboard Cache Service
// =============================================

export class DashboardCacheService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * Dashboard tüm chart verilerini cached olarak al
   */
  async getCachedDashboard(
    dashboardId: string,
    filtersHash?: string
  ): Promise<{
    chartsData: Record<string, unknown>;
    cached: boolean;
  } | null> {
    const cacheKey = filtersHash ? `${dashboardId}:${filtersHash}` : dashboardId;

    // Memory cache kontrolü
    const memCached = memoryCache.get<Record<string, unknown>>(`dashboard:${cacheKey}`);
    if (memCached) {
      return { chartsData: memCached, cached: true };
    }

    // Database cache kontrolü
    const { data, error } = await this.supabase
      .from("dashboard_cache")
      .select("charts_data")
      .eq("dashboard_id", dashboardId)
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    memoryCache.set(`dashboard:${cacheKey}`, data.charts_data, 600);

    return { chartsData: data.charts_data as Record<string, unknown>, cached: true };
  }

  /**
   * Dashboard cache'e kaydet
   */
  async cacheDashboard(
    dashboardId: string,
    chartsData: Record<string, unknown>,
    options: { filtersHash?: string; ttlSeconds?: number } = {}
  ): Promise<void> {
    const { filtersHash, ttlSeconds = 1800 } = options;
    const cacheKey = filtersHash ? `${dashboardId}:${filtersHash}` : dashboardId;

    memoryCache.set(`dashboard:${cacheKey}`, chartsData, ttlSeconds);

    await this.supabase.from("dashboard_cache").upsert({
      dashboard_id: dashboardId,
      cache_key: cacheKey,
      charts_data: chartsData as Json,
      filters_hash: filtersHash,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    } as Database["public"]["Tables"]["dashboard_cache"]["Insert"]);
  }

  /**
   * Dashboard cache'ini invalidate et
   */
  async invalidate(dashboardId: string): Promise<void> {
    memoryCache.deletePattern(`dashboard:${dashboardId}*`);

    await this.supabase.from("dashboard_cache").delete().eq("dashboard_id", dashboardId);
  }
}

// =============================================
// Cache Utilities
// =============================================

/**
 * SWR için cache key generator
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join("&");

  return `${prefix}?${sortedParams}`;
}

/**
 * Cache TTL hesaplama (veri boyutuna göre)
 */
export function calculateTTL(rowCount: number, baseSeconds: number = 3600): number {
  // Büyük veri setleri daha uzun cache'lenir
  if (rowCount > 100000) return baseSeconds * 4;
  if (rowCount > 10000) return baseSeconds * 2;
  if (rowCount > 1000) return baseSeconds;
  return baseSeconds / 2;
}

/**
 * Cache invalidation event handler
 */
export function createCacheInvalidator(chartCache: ChartCacheService) {
  return {
    onDatasetUpdate: async (datasetId: string) => {
      await chartCache.invalidateByDataset(datasetId, "dataset_update");
    },

    onChartUpdate: async (chartId: string) => {
      await chartCache.invalidate(chartId, "chart_update");
    },

    onFiltersChange: async (chartId: string) => {
      await chartCache.invalidate(chartId, "filters_change");
    },
  };
}

// =============================================
// Exports
// =============================================

export const chartCache = new ChartCacheService();
export const queryCache = new QueryCacheService();
export const dashboardCache = new DashboardCacheService();

export { memoryCache };
