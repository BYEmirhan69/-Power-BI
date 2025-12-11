/**
 * Web Scraping Service
 * Cheerio (statik) + Puppeteer (dinamik) kombinasyonu
 */

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import {
  type ScrapingConfig,
  type ScrapingResult,
  type ScrapingSelector,
} from "@/types/data-collection.types";

// Cheerio element tip tanımı
type CheerioElement = ReturnType<CheerioAPI>;

export class ScrapingService {
  /**
   * Web scraping işlemini başlatır
   */
  async scrape(config: ScrapingConfig): Promise<ScrapingResult> {
    const startTime = Date.now();

    try {
      // JavaScript gerektiren siteler için Puppeteer kullan
      if (config.javascript || config.engine === "puppeteer") {
        return await this.scrapeWithPuppeteer(config, startTime);
      }

      // Statik siteler için Cheerio kullan
      return await this.scrapeWithCheerio(config, startTime);
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Cheerio ile statik HTML scraping
   */
  private async scrapeWithCheerio(
    config: ScrapingConfig,
    startTime: number
  ): Promise<ScrapingResult> {
    const allData: Record<string, unknown>[] = [];
    let pagesScraped = 0;
    let currentUrl: string | null = config.url;

    while (currentUrl && pagesScraped < (config.pagination?.maxPages || 1)) {
      const html = await this.fetchHtml(currentUrl, config);
      const $ = cheerio.load(html);

      const pageData = this.extractData($, config.selectors);
      allData.push(...pageData);
      pagesScraped++;

      // Pagination kontrolü
      if (config.pagination?.enabled && config.pagination.nextSelector) {
        const nextLink = $(config.pagination.nextSelector).attr("href");
        if (nextLink) {
          currentUrl = this.resolveUrl(currentUrl, nextLink);
          await this.sleep(config.pagination.delay || 1000);
        } else {
          currentUrl = null;
        }
      } else {
        currentUrl = null;
      }
    }

    return {
      success: true,
      data: allData,
      pagesScraped,
      totalRecords: allData.length,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Puppeteer ile dinamik scraping (server-side API route'da çalışır)
   */
  private async scrapeWithPuppeteer(
    config: ScrapingConfig,
    startTime: number
  ): Promise<ScrapingResult> {
    // Puppeteer dinamik import - sadece server-side'da yüklenecek
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let puppeteer: any;
    try {
      // @ts-expect-error - Puppeteer opsiyonel bağımlılıktır
      puppeteer = await import("puppeteer");
    } catch {
      return {
        success: false,
        error: "Puppeteer kurulu değil. Dinamik scraping için 'npm install puppeteer' çalıştırın.",
        data: [],
        pagesScraped: 0,
        totalRecords: 0,
        duration: Date.now() - startTime,
      };
    }
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const allData: Record<string, unknown>[] = [];
    let pagesScraped = 0;

    try {
      const page = await browser.newPage();

      // User agent ayarla
      if (config.userAgent) {
        await page.setUserAgent(config.userAgent);
      } else {
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
      }

      // Extra headers
      if (config.headers) {
        await page.setExtraHTTPHeaders(config.headers as Record<string, string>);
      }

      // Cookies
      if (config.cookies) {
        await page.setCookie(
          ...config.cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain || new URL(config.url).hostname,
          }))
        );
      }

      let currentUrl: string | null = config.url;

      while (currentUrl && pagesScraped < (config.pagination?.maxPages || 1)) {
        await page.goto(currentUrl, {
          waitUntil: "networkidle2",
          timeout: config.timeout,
        });

        // Belirli bir element'i bekle
        if (config.waitForSelector) {
          await page.waitForSelector(config.waitForSelector, {
            timeout: config.timeout,
          });
        }

        // HTML'i al ve parse et
        const html = await page.content();
        const $ = cheerio.load(html);

        const pageData = this.extractData($, config.selectors);
        allData.push(...pageData);
        pagesScraped++;

        // Pagination
        if (config.pagination?.enabled && config.pagination.nextSelector) {
          const nextLink = await page.$eval(
            config.pagination.nextSelector,
            (el: Element) => (el as HTMLAnchorElement).href
          ).catch(() => null);

          if (nextLink) {
            currentUrl = nextLink;
            await this.sleep(config.pagination.delay || 1000);
          } else {
            currentUrl = null;
          }
        } else {
          currentUrl = null;
        }
      }

      return {
        success: true,
        data: allData,
        pagesScraped,
        totalRecords: allData.length,
        duration: Date.now() - startTime,
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * HTML fetch eder
   */
  private async fetchHtml(url: string, config: ScrapingConfig): Promise<string> {
    const headers: Record<string, string> = {
      "User-Agent":
        config.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      ...(config.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(config.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Seçicileri kullanarak veri çıkarır
   */
  private extractData(
    $: CheerioAPI,
    selectors: ScrapingSelector[]
  ): Record<string, unknown>[] {
    // Çoklu kayıt mı yoksa tek kayıt mı?
    const multipleSelector = selectors.find((s) => s.multiple);

    if (multipleSelector) {
      // Çoklu kayıt: Her element için bir kayıt oluştur
      const results: Record<string, unknown>[] = [];
      const elements = $(multipleSelector.selector);

      elements.each((_, element) => {
        const record: Record<string, unknown> = {};
        
        for (const selector of selectors) {
          const target = selector.multiple
            ? $(element)
            : $(element).find(selector.selector);

          record[selector.name] = this.extractValue($, target, selector);
        }

        results.push(record);
      });

      return results;
    } else {
      // Tek kayıt: Tüm seçicilerden tek bir obje oluştur
      const record: Record<string, unknown> = {};

      for (const selector of selectors) {
        const elements = $(selector.selector);
        record[selector.name] = this.extractValue($, elements, selector);
      }

      return [record];
    }
  }

  /**
   * Tek bir element'ten değer çıkarır
   */
  private extractValue(
    $: CheerioAPI,
    elements: CheerioElement,
    selector: ScrapingSelector
  ): unknown {
    let value: string | null = null;

    if (selector.attribute) {
      value = elements.attr(selector.attribute) || null;
    } else {
      value = elements.text().trim() || null;
    }

    if (value === null) return null;

    // Transform uygula
    return this.transformValue(value, selector.transform);
  }

  /**
   * Değere dönüşüm uygular
   */
  private transformValue(
    value: string,
    transform?: ScrapingSelector["transform"]
  ): unknown {
    if (!transform) return value;

    switch (transform) {
      case "text":
        return value;
      case "html":
        return value; // Zaten HTML olabilir
      case "number":
        const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
        return isNaN(num) ? null : num;
      case "date":
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString();
      case "trim":
        return value.trim();
      case "lowercase":
        return value.toLowerCase();
      case "uppercase":
        return value.toUpperCase();
      default:
        return value;
    }
  }

  /**
   * Relative URL'i absolute URL'e çevirir
   */
  private resolveUrl(baseUrl: string, relativeUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch {
      return relativeUrl;
    }
  }

  /**
   * Belirtilen süre kadar bekler
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Scraping şablonu oluşturur (kullanıcı yardımı için)
   */
  static createTemplate(type: "table" | "list" | "article"): Partial<ScrapingConfig> {
    switch (type) {
      case "table":
        return {
          engine: "cheerio",
          selectors: [
            {
              name: "rows",
              selector: "table tbody tr",
              selectorType: "css",
              multiple: true,
            },
          ],
        };
      case "list":
        return {
          engine: "cheerio",
          selectors: [
            {
              name: "items",
              selector: "ul li, ol li",
              selectorType: "css",
              multiple: true,
            },
          ],
        };
      case "article":
        return {
          engine: "cheerio",
          selectors: [
            { name: "title", selector: "h1, .title", selectorType: "css", multiple: false },
            { name: "content", selector: "article, .content", selectorType: "css", multiple: false },
            { name: "date", selector: "time, .date", selectorType: "css", multiple: false, transform: "date" },
          ],
        };
      default:
        return {};
    }
  }

  /**
   * URL'in scraping için uygun olup olmadığını test eder
   */
  async testUrl(url: string): Promise<{
    success: boolean;
    message: string;
    requiresJavaScript: boolean;
    suggestedEngine: "cheerio" | "puppeteer";
  }> {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DataCollector/1.0)",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
          requiresJavaScript: false,
          suggestedEngine: "cheerio",
        };
      }

      // Basit heuristik: SPA framework'leri genelde JS gerektirir
      const html = await (await fetch(url)).text();
      const requiresJS =
        html.includes("__NEXT_DATA__") || // Next.js
        html.includes("ng-app") || // Angular
        html.includes("id=\"app\"") || // Vue.js
        html.includes("data-reactroot") || // React
        html.length < 5000; // Çok kısa HTML genelde JS ile doldurulur

      return {
        success: true,
        message: "URL erişilebilir",
        requiresJavaScript: requiresJS,
        suggestedEngine: requiresJS ? "puppeteer" : "cheerio",
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        requiresJavaScript: false,
        suggestedEngine: "cheerio",
      };
    }
  }
}

// Singleton instance
export const scrapingService = new ScrapingService();
