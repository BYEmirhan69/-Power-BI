/**
 * HTTP Client - REST API Entegrasyonu
 * Genel amaçlı HTTP client, çeşitli auth türlerini destekler
 */

import {
  type ApiRequestConfig,
  type ApiResponse,
  type AuthConfig,
} from "@/types/data-collection.types";

// Rate limiting için basit bir store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class HttpClient {
  private defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /**
   * Rate limiting kontrolü yapar
   */
  private checkRateLimit(url: string, maxRequests = 100, windowMs = 60000): boolean {
    const domain = new URL(url).hostname;
    const now = Date.now();
    const entry = rateLimitStore.get(domain);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(domain, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * API isteği gönderir
   */
  async request<T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Rate limit kontrolü
    if (!this.checkRateLimit(config.url)) {
      return {
        success: false,
        error: "Rate limit aşıldı. Lütfen bekleyin.",
        duration: Date.now() - startTime,
      };
    }

    for (let attempt = 0; attempt <= config.retryCount; attempt++) {
      try {
        const response = await this.executeRequest<T>(config);
        response.duration = Date.now() - startTime;
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // Son deneme değilse bekle ve tekrar dene
        if (attempt < config.retryCount) {
          await this.sleep(config.retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Bilinmeyen hata",
      duration: Date.now() - startTime,
    };
  }

  /**
   * Tek bir HTTP isteği yürütür
   */
  private async executeRequest<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const url = this.buildUrl(config.url, config.queryParams as Record<string, string>);
    const headers = await this.buildHeaders(config.headers as Record<string, string>, config.auth);

    const fetchOptions: RequestInit = {
      method: config.method,
      headers,
      signal: AbortSignal.timeout(config.timeout),
    };

    // Body ekle (GET ve HEAD dışındaki metodlar için)
    if (config.body && !["GET", "HEAD"].includes(config.method)) {
      fetchOptions.body = typeof config.body === "string" 
        ? config.body 
        : JSON.stringify(config.body);
    }

    const response = await fetch(url, fetchOptions);
    const responseHeaders = this.parseHeaders(response.headers);

    // Yanıt içeriğini parse et
    let data: T | undefined;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (contentType.includes("text/")) {
      data = (await response.text()) as T;
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        headers: responseHeaders,
        data,
      };
    }

    return {
      success: true,
      data,
      statusCode: response.status,
      headers: responseHeaders,
    };
  }

  /**
   * URL'e query parametreleri ekler
   */
  private buildUrl(baseUrl: string, queryParams?: Record<string, string>): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  /**
   * İstek header'larını oluşturur
   */
  private async buildHeaders(
    customHeaders?: Record<string, string>,
    auth?: AuthConfig
  ): Promise<Record<string, string>> {
    const headers = { ...this.defaultHeaders, ...customHeaders };

    if (!auth || auth.type === "none") {
      return headers;
    }

    switch (auth.type) {
      case "bearer":
        headers["Authorization"] = `Bearer ${auth.token}`;
        break;

      case "api_key":
        if (auth.location === "header") {
          headers[auth.key] = auth.value;
        }
        // query location durumu buildUrl'de ele alınır
        break;

      case "basic":
        const credentials = btoa(`${auth.username}:${auth.password}`);
        headers["Authorization"] = `Basic ${credentials}`;
        break;

      case "oauth2":
        const token = await this.getOAuth2Token(auth);
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        break;
    }

    return headers;
  }

  /**
   * OAuth2 token alır
   */
  private async getOAuth2Token(auth: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scopes?: string[];
  }): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
      });

      if (auth.scopes && auth.scopes.length > 0) {
        body.append("scope", auth.scopes.join(" "));
      }

      const response = await fetch(auth.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        console.error("OAuth2 token alınamadı:", response.statusText);
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("OAuth2 token hatası:", error);
      return null;
    }
  }

  /**
   * Response header'larını parse eder
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Belirtilen süre kadar bekler
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * API bağlantısını test eder
   */
  async testConnection(config: ApiRequestConfig): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.request({
        ...config,
        retryCount: 0, // Test için retry yapma
        timeout: 10000, // 10 saniye timeout
      });

      const latency = Date.now() - startTime;

      if (response.success) {
        return {
          success: true,
          message: `Bağlantı başarılı (${latency}ms)`,
          latency,
        };
      }

      return {
        success: false,
        message: response.error || "Bağlantı başarısız",
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Pagination ile veri çeker
   */
  async fetchPaginated<T>(
    config: ApiRequestConfig,
    options: {
      pageParam?: string;
      limitParam?: string;
      pageSize?: number;
      maxPages?: number;
      getNextPage?: (response: T) => string | number | null;
      getData?: (response: T) => unknown[];
    }
  ): Promise<ApiResponse<unknown[]>> {
    const {
      pageParam = "page",
      limitParam = "limit",
      pageSize = 100,
      maxPages = 10,
      getNextPage,
      getData = (r) => (Array.isArray(r) ? r : [r]),
    } = options;

    const allData: unknown[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= maxPages) {
      const pageConfig: ApiRequestConfig = {
        ...config,
        queryParams: {
          ...config.queryParams,
          [pageParam]: String(currentPage),
          [limitParam]: String(pageSize),
        },
      };

      const response = await this.request<T>(pageConfig);

      if (!response.success || !response.data) {
        if (currentPage === 1) {
          return response as ApiResponse<unknown[]>;
        }
        break;
      }

      const pageData = getData(response.data);
      allData.push(...pageData);

      // Sonraki sayfa var mı kontrol et
      if (getNextPage) {
        const nextPage = getNextPage(response.data);
        hasMore = nextPage !== null;
        if (typeof nextPage === "number") {
          currentPage = nextPage;
        } else {
          currentPage++;
        }
      } else {
        hasMore = pageData.length === pageSize;
        currentPage++;
      }
    }

    return {
      success: true,
      data: allData,
    };
  }
}

// Singleton instance
export const httpClient = new HttpClient();
