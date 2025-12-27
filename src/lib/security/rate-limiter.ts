/**
 * Rate Limiting Service
 * Token bucket / sliding window algoritması
 * IP bazlı güvenlik, brute-force koruması
 */

import { createClient } from "@/lib/supabase/client";
import type { Json, Database } from "@/types/database.types";

// =============================================
// Types
// =============================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
  blocked?: boolean;
  unblockAt?: Date;
  reason?: string;
}

export interface RateLimitConfig {
  name: string;
  endpointPattern: string;
  maxRequests: number;
  windowSeconds: number;
  penaltySeconds: number;
}

export interface SecurityEvent {
  eventType:
    | "rate_limit_exceeded"
    | "brute_force_detected"
    | "ip_blocked"
    | "suspicious_activity"
    | "failed_login_attempt"
    | "unauthorized_access"
    | "scraping_detected"
    | "2fa_bypass_attempt";
  severity: "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  userId?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
}

// =============================================
// In-Memory Rate Limiter (for Edge/Middleware)
// =============================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

class InMemoryRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval = 60000; // 1 dakika
  private lastCleanup = Date.now();

  /**
   * Rate limit kontrolü
   */
  check(
    identifier: string,
    maxRequests: number,
    windowMs: number,
    penaltyMs: number = 0
  ): RateLimitResult {
    this.maybeCleanup();

    const now = Date.now();
    const key = identifier;
    let entry = this.limits.get(key);

    // Blocked kontrolü
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        blocked: true,
        unblockAt: new Date(entry.blockedUntil),
        reason: "Rate limit exceeded",
      };
    }

    // Yeni window veya süresi dolmuş
    if (!entry || now - entry.windowStart > windowMs) {
      entry = {
        count: 1,
        windowStart: now,
      };
      this.limits.set(key, entry);

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: new Date(now + windowMs),
      };
    }

    // Limit kontrolü
    if (entry.count >= maxRequests) {
      // Penaltı uygula
      if (penaltyMs > 0) {
        entry.blockedUntil = now + penaltyMs;
        this.limits.set(key, entry);
      }

      return {
        allowed: false,
        remaining: 0,
        blocked: true,
        unblockAt: penaltyMs > 0 ? new Date(now + penaltyMs) : undefined,
        reason: "Rate limit exceeded",
      };
    }

    // İzin ver ve sayacı artır
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: new Date(entry.windowStart + windowMs),
    };
  }

  /**
   * Identifier'ı sıfırla
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Eski kayıtları temizle
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    const oneHourAgo = now - 3600000;

    for (const [key, entry] of this.limits.entries()) {
      if (entry.windowStart < oneHourAgo && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.limits.delete(key);
      }
    }
  }
}

// Global instance
const memoryLimiter = new InMemoryRateLimiter();

// =============================================
// Database-backed Rate Limiter
// =============================================

export class RateLimitService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * Rate limit kontrolü (database + memory hybrid)
   */
  async checkLimit(
    identifier: string,
    identifierType: "ip" | "user" | "api_key",
    endpoint: string
  ): Promise<RateLimitResult> {
    // Önce memory'de hızlı kontrol
    const memResult = memoryLimiter.check(
      `${identifierType}:${identifier}:${endpoint}`,
      100, // Default limit
      60000, // 1 dakika
      300000 // 5 dakika penalty
    );

    if (!memResult.allowed) {
      return memResult;
    }

    // Database'den detaylı kontrol
    const { data, error } = await this.supabase.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_identifier_type: identifierType,
      p_endpoint: endpoint,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // Hata durumunda izin ver ama logla
      return { allowed: true, remaining: -1 };
    }

    const result = data as {
      allowed: boolean;
      remaining?: number;
      blocked?: boolean;
      unblock_at?: string;
      reset_at?: string;
      reason?: string;
    } | null;

    return {
      allowed: result?.allowed ?? true,
      remaining: result?.remaining ?? 0,
      blocked: result?.blocked,
      unblockAt: result?.unblock_at ? new Date(result.unblock_at) : undefined,
      resetAt: result?.reset_at ? new Date(result.reset_at) : undefined,
      reason: result?.reason,
    };
  }

  /**
   * IP'yi blokla
   */
  async blockIP(
    ipAddress: string,
    reason: string,
    durationHours: number = 24,
    permanent: boolean = false
  ): Promise<void> {
    await this.supabase.rpc("block_ip", {
      p_ip_address: ipAddress,
      p_reason: reason,
      p_duration_hours: durationHours,
      p_permanent: permanent,
    });
  }

  /**
   * IP bloğunu kaldır
   */
  async unblockIP(ipAddress: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("blocked_ips")
      .delete()
      .eq("ip_address", ipAddress);

    return !error;
  }

  /**
   * IP'nin bloklu olup olmadığını kontrol et
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const { data } = await this.supabase
      .from("blocked_ips")
      .select("id")
      .eq("ip_address", ipAddress)
      .or(`unblock_at.gt.${new Date().toISOString()},permanent.eq.true`)
      .single();

    return !!data;
  }

  /**
   * IP allowlist'e ekle
   */
  async addToAllowlist(
    ipAddress: string,
    reason: string,
    organizationId?: string,
    userId?: string
  ): Promise<void> {
    await this.supabase.from("ip_access_list").insert({
      ip_address: ipAddress,
      list_type: "allow",
      reason,
      organization_id: organizationId,
      created_by: userId,
    } as Database["public"]["Tables"]["ip_access_list"]["Insert"]);
  }

  /**
   * IP denylist'e ekle
   */
  async addToDenylist(
    ipAddress: string,
    reason: string,
    expiresAt?: Date,
    organizationId?: string,
    userId?: string
  ): Promise<void> {
    await this.supabase.from("ip_access_list").insert({
      ip_address: ipAddress,
      list_type: "deny",
      reason,
      expires_at: expiresAt?.toISOString(),
      organization_id: organizationId,
      created_by: userId,
    } as Database["public"]["Tables"]["ip_access_list"]["Insert"]);
  }

  /**
   * IP erişim listesini kontrol et
   */
  async checkIPAccess(ipAddress: string): Promise<"allow" | "deny" | "neutral"> {
    // Önce deny listesini kontrol et
    const { data: denyEntry } = await this.supabase
      .from("ip_access_list")
      .select("id")
      .eq("ip_address", ipAddress)
      .eq("list_type", "deny")
      .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
      .single();

    if (denyEntry) {
      return "deny";
    }

    // Allow listesini kontrol et
    const { data: allowEntry } = await this.supabase
      .from("ip_access_list")
      .select("id")
      .eq("ip_address", ipAddress)
      .eq("list_type", "allow")
      .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
      .single();

    if (allowEntry) {
      return "allow";
    }

    return "neutral";
  }

  /**
   * Güvenlik olayı logla
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.supabase.from("security_events").insert({
      event_type: event.eventType,
      severity: event.severity,
      ip_address: event.ipAddress,
      user_id: event.userId,
      endpoint: event.endpoint,
      metadata: (event.metadata as Json) || {},
    } as Database["public"]["Tables"]["security_events"]["Insert"]);
  }

  /**
   * Güvenlik olaylarını getir
   */
  async getSecurityEvents(options: {
    eventTypes?: SecurityEvent["eventType"][];
    severity?: SecurityEvent["severity"][];
    limit?: number;
    unresolved?: boolean;
  }): Promise<
    Array<{
      id: string;
      event_type: string;
      severity: string;
      ip_address: string | null;
      created_at: string;
      resolved: boolean;
    }>
  > {
    const { eventTypes, severity, limit = 100, unresolved = false } = options;

    let query = this.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventTypes && eventTypes.length > 0) {
      query = query.in("event_type", eventTypes);
    }

    if (severity && severity.length > 0) {
      query = query.in("severity", severity);
    }

    if (unresolved) {
      query = query.eq("resolved", false);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Brute-force saldırısı tespit et
   */
  async detectBruteForce(
    ipAddress: string,
    endpoint: string,
    threshold: number = 10,
    windowMinutes: number = 15
  ): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count } = await this.supabase
      .from("security_events")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ipAddress)
      .eq("endpoint", endpoint)
      .eq("event_type", "failed_login_attempt")
      .gte("created_at", windowStart);

    if ((count ?? 0) >= threshold) {
      // Brute-force tespit edildi - IP'yi blokla ve logla
      await this.blockIP(ipAddress, "Brute-force attack detected", 24);

      await this.logSecurityEvent({
        eventType: "brute_force_detected",
        severity: "high",
        ipAddress,
        endpoint,
        metadata: { failed_attempts: count, window_minutes: windowMinutes },
      });

      return true;
    }

    return false;
  }

  /**
   * Scraping tespiti
   */
  async detectScraping(
    ipAddress: string,
    requestsPerMinute: number,
    threshold: number = 60
  ): Promise<boolean> {
    if (requestsPerMinute > threshold) {
      await this.logSecurityEvent({
        eventType: "scraping_detected",
        severity: "medium",
        ipAddress,
        metadata: { requests_per_minute: requestsPerMinute },
      });

      // Geçici olarak blokla
      await this.blockIP(ipAddress, "Scraping detected", 1);

      return true;
    }

    return false;
  }
}

// =============================================
// Rate Limit Configurations
// =============================================

export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  api_general: {
    name: "api_general",
    endpointPattern: "/api/*",
    maxRequests: 100,
    windowSeconds: 60,
    penaltySeconds: 300,
  },
  auth_login: {
    name: "auth_login",
    endpointPattern: "/api/auth/login",
    maxRequests: 5,
    windowSeconds: 300,
    penaltySeconds: 900,
  },
  auth_register: {
    name: "auth_register",
    endpointPattern: "/api/auth/register",
    maxRequests: 3,
    windowSeconds: 3600,
    penaltySeconds: 3600,
  },
  data_upload: {
    name: "data_upload",
    endpointPattern: "/api/datasets/upload",
    maxRequests: 10,
    windowSeconds: 3600,
    penaltySeconds: 1800,
  },
  report_generate: {
    name: "report_generate",
    endpointPattern: "/api/reports/generate",
    maxRequests: 5,
    windowSeconds: 3600,
    penaltySeconds: 1800,
  },
  ai_requests: {
    name: "ai_requests",
    endpointPattern: "/api/ai/*",
    maxRequests: 20,
    windowSeconds: 3600,
    penaltySeconds: 1800,
  },
};

// =============================================
// Exports
// =============================================

export const rateLimiter = new RateLimitService();
export { memoryLimiter };

/**
 * Middleware için basit rate limit kontrolü
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  return memoryLimiter.check(
    identifier,
    config.maxRequests,
    config.windowSeconds * 1000,
    config.penaltySeconds * 1000
  );
}

/**
 * IP adresini request'ten çıkar
 */
export function extractIP(request: Request): string {
  // Cloudflare
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;

  // X-Forwarded-For
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // X-Real-IP
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;

  return "unknown";
}
