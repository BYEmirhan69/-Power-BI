/**
 * Email Service
 * E-posta bildirimleri, template sistemi, queue entegrasyonu
 * Rate limiting ve spam önleme
 */

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

// =============================================
// Types
// =============================================

export type EmailStatus = "pending" | "queued" | "sending" | "sent" | "failed" | "bounced";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[];
  category: "transactional" | "notification" | "marketing" | "report" | "alert";
  isActive: boolean;
}

export interface SendEmailOptions {
  templateName: string;
  toEmail: string;
  toName?: string;
  variables: Record<string, string>;
  organizationId?: string;
  userId?: string;
  priority?: number;
  scheduledAt?: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    url: string;
  }>;
  triggeredBy?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface EmailPreferences {
  chartShared: boolean;
  reportReady: boolean;
  dataImportStatus: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  digestFrequency: "daily" | "weekly" | "monthly" | "never";
  unsubscribedAll: boolean;
}

export interface EmailQueueItem {
  id: string;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  priority: number;
  scheduledAt: string;
  sentAt: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

// =============================================
// Email Service
// =============================================

export class EmailService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  // =============================================
  // Template Management
  // =============================================

  /**
   * Tüm template'leri listele
   */
  async listTemplates(): Promise<EmailTemplate[]> {
    const { data, error } = await this.supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      throw new Error(`Template'ler listelenemedi: ${error.message}`);
    }

    return (data || []).map(this.mapTemplate);
  }

  /**
   * Template getir
   */
  async getTemplate(name: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from("email_templates")
      .select("*")
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapTemplate(data);
  }

  /**
   * Template oluştur/güncelle
   */
  async upsertTemplate(template: Omit<EmailTemplate, "id">): Promise<EmailTemplate> {
    const { data, error } = await this.supabase
      .from("email_templates")
      .upsert({
        name: template.name,
        subject: template.subject,
        html_body: template.htmlBody,
        text_body: template.textBody,
        variables: template.variables,
        category: template.category,
        is_active: template.isActive,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Template kaydedilemedi: ${error.message}`);
    }

    return this.mapTemplate(data);
  }

  // =============================================
  // Email Sending
  // =============================================

  /**
   * E-posta kuyruğuna ekle
   */
  async queueEmail(options: SendEmailOptions): Promise<string | null> {
    const { data, error } = await this.supabase.rpc("queue_email", {
      p_to_email: options.toEmail,
      p_template_name: options.templateName,
      p_variables: options.variables as unknown as Json,
      p_organization_id: options.organizationId,
      p_user_id: options.userId,
      p_priority: options.priority || 5,
      p_scheduled_at: options.scheduledAt?.toISOString() || new Date().toISOString(),
      p_attachments: options.attachments ? (options.attachments as unknown as Json) : null,
      p_triggered_by: options.triggeredBy,
      p_related_entity_type: options.relatedEntityType,
      p_related_entity_id: options.relatedEntityId,
    });

    if (error) {
      console.error("Email kuyruğa eklenemedi:", error);
      return null;
    }

    return data as string;
  }

  /**
   * Grafik paylaşım e-postası gönder
   */
  async sendChartSharedEmail(
    toEmail: string,
    toName: string,
    sharerName: string,
    chartName: string,
    chartUrl: string,
    organizationId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "chart_shared",
      toEmail,
      toName,
      variables: {
        recipient_name: toName,
        sharer_name: sharerName,
        chart_name: chartName,
        chart_url: chartUrl,
      },
      organizationId,
      triggeredBy: "chart_share",
      priority: 5,
    });
  }

  /**
   * Veri aktarımı başarılı e-postası gönder
   */
  async sendDataImportSuccessEmail(
    toEmail: string,
    userName: string,
    datasetName: string,
    rowCount: number,
    datasetUrl: string,
    organizationId?: string,
    userId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "data_import_success",
      toEmail,
      variables: {
        user_name: userName,
        dataset_name: datasetName,
        row_count: rowCount.toLocaleString("tr-TR"),
        dataset_url: datasetUrl,
      },
      organizationId,
      userId,
      triggeredBy: "data_import",
      priority: 4,
    });
  }

  /**
   * Veri aktarımı başarısız e-postası gönder
   */
  async sendDataImportFailedEmail(
    toEmail: string,
    userName: string,
    datasetName: string,
    errorMessage: string,
    retryUrl: string,
    organizationId?: string,
    userId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "data_import_failed",
      toEmail,
      variables: {
        user_name: userName,
        dataset_name: datasetName,
        error_message: errorMessage,
        retry_url: retryUrl,
      },
      organizationId,
      userId,
      triggeredBy: "data_import",
      priority: 3, // Yüksek öncelik
    });
  }

  /**
   * Rapor hazır e-postası gönder
   */
  async sendReportReadyEmail(
    toEmail: string,
    userName: string,
    reportName: string,
    format: string,
    downloadUrl: string,
    expiryHours: number = 72,
    organizationId?: string,
    userId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "report_ready",
      toEmail,
      variables: {
        user_name: userName,
        report_name: reportName,
        format: format.toUpperCase(),
        download_url: downloadUrl,
        expiry_hours: expiryHours.toString(),
      },
      organizationId,
      userId,
      triggeredBy: "report_generation",
      priority: 5,
    });
  }

  /**
   * Haftalık özet e-postası gönder
   */
  async sendWeeklyDigestEmail(
    toEmail: string,
    userName: string,
    weekRange: string,
    stats: {
      newDatasets: number;
      newCharts: number;
      totalViews: number;
    },
    dashboardUrl: string,
    organizationId?: string,
    userId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "weekly_digest",
      toEmail,
      variables: {
        user_name: userName,
        week_range: weekRange,
        new_datasets: stats.newDatasets.toString(),
        new_charts: stats.newCharts.toString(),
        total_views: stats.totalViews.toLocaleString("tr-TR"),
        dashboard_url: dashboardUrl,
      },
      organizationId,
      userId,
      triggeredBy: "weekly_digest",
      priority: 7, // Düşük öncelik
    });
  }

  /**
   * Güvenlik uyarısı e-postası gönder
   */
  async sendSecurityAlertEmail(
    toEmail: string,
    alertType: string,
    alertDetails: string,
    ipAddress: string,
    timestamp: Date,
    securityUrl: string,
    organizationId?: string,
    userId?: string
  ): Promise<string | null> {
    return this.queueEmail({
      templateName: "security_alert",
      toEmail,
      variables: {
        alert_type: alertType,
        alert_details: alertDetails,
        ip_address: ipAddress,
        timestamp: timestamp.toLocaleString("tr-TR"),
        security_url: securityUrl,
      },
      organizationId,
      userId,
      triggeredBy: "security_alert",
      priority: 1, // En yüksek öncelik
    });
  }

  // =============================================
  // Email Queue Management
  // =============================================

  /**
   * Bekleyen e-postaları listele
   */
  async listPendingEmails(
    organizationId?: string,
    limit: number = 50
  ): Promise<EmailQueueItem[]> {
    let query = this.supabase
      .from("email_queue")
      .select("*")
      .in("status", ["pending", "queued"])
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return (data || []).map(this.mapQueueItem);
  }

  /**
   * E-posta durumunu güncelle
   */
  async updateEmailStatus(
    emailId: string,
    status: EmailStatus,
    providerMessageId?: string,
    error?: string
  ): Promise<boolean> {
    const { error: updateError } = await this.supabase.rpc("update_email_status", {
      p_email_id: emailId,
      p_status: status,
      p_provider_message_id: providerMessageId,
      p_error: error,
    });

    return !updateError;
  }

  /**
   * E-posta istatistiklerini getir
   */
  async getEmailStats(organizationId: string): Promise<{
    totalSent: number;
    pending: number;
    failed: number;
    bounced: number;
    openRate: number;
  }> {
    const statuses = ["sent", "pending", "failed", "bounced"] as const;
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await this.supabase
        .from("email_queue")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", status);

      stats[status] = count || 0;
    }

    // Open rate hesapla
    const { count: openedCount } = await this.supabase
      .from("email_queue")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "sent")
      .not("opened_at", "is", null);

    const openRate = stats.sent > 0 ? ((openedCount || 0) / stats.sent) * 100 : 0;

    return {
      totalSent: stats.sent,
      pending: stats.pending,
      failed: stats.failed,
      bounced: stats.bounced,
      openRate: Math.round(openRate * 100) / 100,
    };
  }

  // =============================================
  // User Preferences
  // =============================================

  /**
   * Kullanıcı e-posta tercihlerini getir
   */
  async getPreferences(userId: string): Promise<EmailPreferences> {
    const { data, error } = await this.supabase
      .from("email_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Varsayılan tercihler
      return {
        chartShared: true,
        reportReady: true,
        dataImportStatus: true,
        weeklyDigest: true,
        securityAlerts: true,
        productUpdates: false,
        digestFrequency: "weekly",
        unsubscribedAll: false,
      };
    }

    return {
      chartShared: data.chart_shared,
      reportReady: data.report_ready,
      dataImportStatus: data.data_import_status,
      weeklyDigest: data.weekly_digest,
      securityAlerts: data.security_alerts,
      productUpdates: data.product_updates,
      digestFrequency: data.digest_frequency,
      unsubscribedAll: data.unsubscribed_all,
    };
  }

  /**
   * Kullanıcı e-posta tercihlerini güncelle
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<EmailPreferences>
  ): Promise<boolean> {
    const { error } = await this.supabase.from("email_preferences").upsert({
      user_id: userId,
      chart_shared: preferences.chartShared,
      report_ready: preferences.reportReady,
      data_import_status: preferences.dataImportStatus,
      weekly_digest: preferences.weeklyDigest,
      security_alerts: preferences.securityAlerts,
      product_updates: preferences.productUpdates,
      digest_frequency: preferences.digestFrequency,
      unsubscribed_all: preferences.unsubscribedAll,
      unsubscribed_at: preferences.unsubscribedAll ? new Date().toISOString() : null,
    });

    return !error;
  }

  /**
   * Tüm e-postalardan çık
   */
  async unsubscribeAll(userId: string): Promise<boolean> {
    return this.updatePreferences(userId, { unsubscribedAll: true });
  }

  // =============================================
  // Rate Limiting
  // =============================================

  /**
   * E-posta rate limit kontrolü
   */
  async checkRateLimit(organizationId: string): Promise<{
    allowed: boolean;
    dailyRemaining: number;
    hourlyRemaining: number;
  }> {
    const { data, error } = await this.supabase.rpc("check_email_rate_limit", {
      p_organization_id: organizationId,
    });

    if (error) {
      // Hata durumunda izin ver ama uyar
      console.warn("Rate limit kontrolü başarısız:", error);
      return { allowed: true, dailyRemaining: -1, hourlyRemaining: -1 };
    }

    const allowed = data as boolean;

    // Kalan limitleri getir
    const { data: limits } = await this.supabase
      .from("email_rate_limits")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    return {
      allowed,
      dailyRemaining: limits
        ? limits.daily_limit - limits.current_daily_count
        : -1,
      hourlyRemaining: limits
        ? limits.hourly_limit - limits.current_hourly_count
        : -1,
    };
  }

  // =============================================
  // Mapper Functions
  // =============================================

  private mapTemplate(data: Record<string, unknown>): EmailTemplate {
    return {
      id: data.id as string,
      name: data.name as string,
      subject: data.subject as string,
      htmlBody: data.html_body as string,
      textBody: data.text_body as string | null,
      variables: (data.variables as string[]) || [],
      category: data.category as EmailTemplate["category"],
      isActive: data.is_active as boolean,
    };
  }

  private mapQueueItem(data: Record<string, unknown>): EmailQueueItem {
    return {
      id: data.id as string,
      toEmail: data.to_email as string,
      subject: data.subject as string,
      status: data.status as EmailStatus,
      priority: data.priority as number,
      scheduledAt: data.scheduled_at as string,
      sentAt: data.sent_at as string | null,
      triggeredBy: data.triggered_by as string | null,
      createdAt: data.created_at as string,
    };
  }
}

// =============================================
// Exports
// =============================================

export const emailService = new EmailService();

/**
 * E-posta gönderim yardımcı fonksiyonları
 */
export const sendEmail = {
  chartShared: emailService.sendChartSharedEmail.bind(emailService),
  dataImportSuccess: emailService.sendDataImportSuccessEmail.bind(emailService),
  dataImportFailed: emailService.sendDataImportFailedEmail.bind(emailService),
  reportReady: emailService.sendReportReadyEmail.bind(emailService),
  weeklyDigest: emailService.sendWeeklyDigestEmail.bind(emailService),
  securityAlert: emailService.sendSecurityAlertEmail.bind(emailService),
};
