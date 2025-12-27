/**
 * Scheduled Reports Service
 * Zaman bazlı otomatik raporlama
 * PDF/Excel üretimi, scheduler, versiyonlama
 */

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

// =============================================
// Types
// =============================================

export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type ReportGenStatus = "pending" | "generating" | "completed" | "failed" | "cancelled";

export interface ScheduledReport {
  id: string;
  organizationId: string;
  createdBy: string;
  name: string;
  description: string | null;
  dashboardId: string | null;
  chartIds: string[];
  format: "pdf" | "excel" | "csv";
  includeCharts: boolean;
  includeDataTables: boolean;
  dateRangeType: "last_7_days" | "last_30_days" | "last_month" | "last_quarter" | "custom" | null;
  customDateRange: { startDate: string; endDate: string } | null;
  filters: Record<string, unknown> | null;
  frequency: ScheduleFrequency;
  cronExpression: string | null;
  timezone: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hourOfDay: number;
  minuteOfHour: number;
  recipients: Array<{ email: string; name?: string }>;
  includeCreator: boolean;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportGeneration {
  id: string;
  scheduledReportId: string | null;
  organizationId: string;
  reportName: string;
  format: "pdf" | "excel" | "csv";
  version: number;
  status: ReportGenStatus;
  progress: number;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  pageCount: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  deliveredTo: string[];
  triggeredBy: "schedule" | "manual" | "api";
  createdAt: string;
}

export interface CreateScheduledReportInput {
  name: string;
  description?: string;
  dashboardId?: string;
  chartIds?: string[];
  format: "pdf" | "excel" | "csv";
  includeCharts?: boolean;
  includeDataTables?: boolean;
  dateRangeType?: ScheduledReport["dateRangeType"];
  customDateRange?: { startDate: string; endDate: string };
  filters?: Record<string, unknown>;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  timezone?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
  minuteOfHour?: number;
  recipients: Array<{ email: string; name?: string }>;
  includeCreator?: boolean;
}

export interface ReportTemplate {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  layout: {
    orientation: "portrait" | "landscape";
    pageSize: "A4" | "Letter" | "Legal";
    margins: { top: number; right: number; bottom: number; left: number };
    sections: Array<{
      type: "header" | "chart" | "table" | "text" | "footer";
      content?: string;
      chartId?: string;
      options?: Record<string, unknown>;
    }>;
  };
  headerConfig: {
    showLogo: boolean;
    logoUrl?: string;
    title?: string;
    subtitle?: string;
  } | null;
  footerConfig: {
    showPageNumbers: boolean;
    disclaimer?: string;
    generatedAtFormat?: string;
  } | null;
  styles: {
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: number;
  } | null;
  isDefault: boolean;
}

// =============================================
// Scheduled Reports Service
// =============================================

export class ScheduledReportService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  // =============================================
  // Scheduled Report Management
  // =============================================

  /**
   * Zamanlanmış rapor oluştur
   */
  async createScheduledReport(
    organizationId: string,
    userId: string,
    input: CreateScheduledReportInput
  ): Promise<ScheduledReport> {
    const { data, error } = await this.supabase
      .from("scheduled_reports")
      .insert({
        organization_id: organizationId,
        created_by: userId,
        name: input.name,
        description: input.description,
        dashboard_id: input.dashboardId,
        chart_ids: input.chartIds || [],
        format: input.format,
        include_charts: input.includeCharts ?? true,
        include_data_tables: input.includeDataTables ?? true,
        date_range_type: input.dateRangeType,
        custom_date_range: input.customDateRange as unknown as Json,
        filters: input.filters as unknown as Json,
        frequency: input.frequency,
        cron_expression: input.cronExpression,
        timezone: input.timezone || "Europe/Istanbul",
        day_of_week: input.dayOfWeek,
        day_of_month: input.dayOfMonth,
        hour_of_day: input.hourOfDay ?? 8,
        minute_of_hour: input.minuteOfHour ?? 0,
        recipients: input.recipients as unknown as Json,
        include_creator: input.includeCreator ?? true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Zamanlanmış rapor oluşturulamadı: ${error.message}`);
    }

    return this.mapScheduledReport(data);
  }

  /**
   * Zamanlanmış raporları listele
   */
  async listScheduledReports(
    organizationId: string,
    options: { activeOnly?: boolean; createdBy?: string } = {}
  ): Promise<ScheduledReport[]> {
    let query = this.supabase
      .from("scheduled_reports")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (options.activeOnly) {
      query = query.eq("is_active", true);
    }

    if (options.createdBy) {
      query = query.eq("created_by", options.createdBy);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Zamanlanmış raporlar listelenemedi: ${error.message}`);
    }

    return (data || []).map(this.mapScheduledReport);
  }

  /**
   * Zamanlanmış rapor detayı
   */
  async getScheduledReport(reportId: string): Promise<ScheduledReport | null> {
    const { data, error } = await this.supabase
      .from("scheduled_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapScheduledReport(data);
  }

  /**
   * Zamanlanmış rapor güncelle
   */
  async updateScheduledReport(
    reportId: string,
    updates: Partial<CreateScheduledReportInput> & { isActive?: boolean }
  ): Promise<ScheduledReport> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dashboardId !== undefined) updateData.dashboard_id = updates.dashboardId;
    if (updates.chartIds !== undefined) updateData.chart_ids = updates.chartIds;
    if (updates.format !== undefined) updateData.format = updates.format;
    if (updates.includeCharts !== undefined) updateData.include_charts = updates.includeCharts;
    if (updates.includeDataTables !== undefined) updateData.include_data_tables = updates.includeDataTables;
    if (updates.dateRangeType !== undefined) updateData.date_range_type = updates.dateRangeType;
    if (updates.customDateRange !== undefined) updateData.custom_date_range = updates.customDateRange;
    if (updates.filters !== undefined) updateData.filters = updates.filters;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.cronExpression !== undefined) updateData.cron_expression = updates.cronExpression;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.dayOfWeek !== undefined) updateData.day_of_week = updates.dayOfWeek;
    if (updates.dayOfMonth !== undefined) updateData.day_of_month = updates.dayOfMonth;
    if (updates.hourOfDay !== undefined) updateData.hour_of_day = updates.hourOfDay;
    if (updates.minuteOfHour !== undefined) updateData.minute_of_hour = updates.minuteOfHour;
    if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
    if (updates.includeCreator !== undefined) updateData.include_creator = updates.includeCreator;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await this.supabase
      .from("scheduled_reports")
      .update(updateData)
      .eq("id", reportId)
      .select()
      .single();

    if (error) {
      throw new Error(`Zamanlanmış rapor güncellenemedi: ${error.message}`);
    }

    return this.mapScheduledReport(data);
  }

  /**
   * Zamanlanmış rapor sil
   */
  async deleteScheduledReport(reportId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("scheduled_reports")
      .delete()
      .eq("id", reportId);

    return !error;
  }

  // =============================================
  // Report Generation
  // =============================================

  /**
   * Manuel rapor üretimi başlat
   */
  async generateReportNow(
    organizationId: string,
    userId: string,
    options: {
      scheduledReportId?: string;
      reportName?: string;
      dashboardId?: string;
      chartIds?: string[];
      format?: "pdf" | "excel" | "csv";
      parameters?: Record<string, unknown>;
    }
  ): Promise<ReportGeneration> {
    const { data, error } = await this.supabase.rpc("create_report_generation", {
      p_scheduled_report_id: options.scheduledReportId,
      p_organization_id: organizationId,
      p_report_name: options.reportName,
      p_format: options.format || "pdf",
      p_dashboard_id: options.dashboardId,
      p_chart_ids: options.chartIds,
      p_parameters: options.parameters ? (options.parameters as unknown as Json) : null,
      p_triggered_by: "manual",
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Rapor üretimi başlatılamadı: ${error.message}`);
    }

    // Oluşturulan generation kaydını getir
    const generation = await this.getReportGeneration(data as string);
    if (!generation) {
      throw new Error("Rapor üretimi kaydı bulunamadı");
    }

    return generation;
  }

  /**
   * Rapor üretim geçmişini listele
   */
  async listReportGenerations(
    organizationId: string,
    options: {
      scheduledReportId?: string;
      status?: ReportGenStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ generations: ReportGeneration[]; total: number }> {
    const { scheduledReportId, status, limit = 50, offset = 0 } = options;

    let query = this.supabase
      .from("report_generations")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (scheduledReportId) {
      query = query.eq("scheduled_report_id", scheduledReportId);
    }

    if (status && status.length > 0) {
      query = query.in("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Rapor geçmişi listelenemedi: ${error.message}`);
    }

    return {
      generations: (data || []).map(this.mapReportGeneration),
      total: count || 0,
    };
  }

  /**
   * Rapor üretim detayı
   */
  async getReportGeneration(generationId: string): Promise<ReportGeneration | null> {
    const { data, error } = await this.supabase
      .from("report_generations")
      .select("*")
      .eq("id", generationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapReportGeneration(data);
  }

  /**
   * Rapor üretim ilerlemesini güncelle
   */
  async updateGenerationProgress(generationId: string, progress: number): Promise<void> {
    await this.supabase
      .from("report_generations")
      .update({ progress: Math.min(100, Math.max(0, progress)) })
      .eq("id", generationId);
  }

  /**
   * Rapor üretimini tamamla
   */
  async completeGeneration(
    generationId: string,
    result: { fileUrl: string; fileSize: number; pageCount?: number }
  ): Promise<boolean> {
    const { error } = await this.supabase.rpc("complete_report_generation", {
      p_generation_id: generationId,
      p_file_url: result.fileUrl,
      p_file_size: result.fileSize,
      p_page_count: result.pageCount,
    });

    return !error;
  }

  /**
   * Rapor üretimini başarısız olarak işaretle
   */
  async failGeneration(generationId: string, errorMessage: string): Promise<void> {
    await this.supabase
      .from("report_generations")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationId);
  }

  // =============================================
  // Report Templates
  // =============================================

  /**
   * Rapor şablonlarını listele
   */
  async listTemplates(organizationId: string): Promise<ReportTemplate[]> {
    const { data, error } = await this.supabase
      .from("report_templates")
      .select("*")
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order("is_default", { ascending: false })
      .order("name");

    if (error) {
      return [];
    }

    return (data || []).map(this.mapReportTemplate);
  }

  /**
   * Rapor şablonu oluştur
   */
  async createTemplate(
    organizationId: string,
    userId: string,
    template: Omit<ReportTemplate, "id" | "organizationId">
  ): Promise<ReportTemplate> {
    const { data, error } = await this.supabase
      .from("report_templates")
      .insert({
        organization_id: organizationId,
        created_by: userId,
        name: template.name,
        description: template.description,
        layout: template.layout as unknown as Json,
        header_config: template.headerConfig as unknown as Json,
        footer_config: template.footerConfig as unknown as Json,
        styles: template.styles as unknown as Json,
        is_default: template.isDefault,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Şablon oluşturulamadı: ${error.message}`);
    }

    return this.mapReportTemplate(data);
  }

  // =============================================
  // Statistics
  // =============================================

  /**
   * Rapor istatistiklerini getir
   */
  async getReportStats(organizationId: string): Promise<{
    totalScheduled: number;
    activeScheduled: number;
    totalGenerated: number;
    lastGeneratedAt: string | null;
    successRate: number;
  }> {
    // Zamanlanmış rapor sayıları
    const { count: totalScheduled } = await this.supabase
      .from("scheduled_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    const { count: activeScheduled } = await this.supabase
      .from("scheduled_reports")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    // Üretim istatistikleri
    const { data: generations } = await this.supabase
      .from("report_generations")
      .select("status, completed_at")
      .eq("organization_id", organizationId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = generations?.filter((g: any) => g.status === "completed").length || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failed = generations?.filter((g: any) => g.status === "failed").length || 0;
    const total = completed + failed;

    const lastGenerated = generations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.filter((g: any) => g.status === "completed" && g.completed_at)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

    return {
      totalScheduled: totalScheduled || 0,
      activeScheduled: activeScheduled || 0,
      totalGenerated: generations?.length || 0,
      lastGeneratedAt: lastGenerated?.completed_at || null,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
    };
  }

  // =============================================
  // Mapper Functions
  // =============================================

  private mapScheduledReport(data: Record<string, unknown>): ScheduledReport {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      createdBy: data.created_by as string,
      name: data.name as string,
      description: data.description as string | null,
      dashboardId: data.dashboard_id as string | null,
      chartIds: (data.chart_ids as string[]) || [],
      format: data.format as "pdf" | "excel" | "csv",
      includeCharts: data.include_charts as boolean,
      includeDataTables: data.include_data_tables as boolean,
      dateRangeType: data.date_range_type as ScheduledReport["dateRangeType"],
      customDateRange: data.custom_date_range as { startDate: string; endDate: string } | null,
      filters: data.filters as Record<string, unknown> | null,
      frequency: data.frequency as ScheduleFrequency,
      cronExpression: data.cron_expression as string | null,
      timezone: data.timezone as string,
      dayOfWeek: data.day_of_week as number | null,
      dayOfMonth: data.day_of_month as number | null,
      hourOfDay: data.hour_of_day as number,
      minuteOfHour: data.minute_of_hour as number,
      recipients: (data.recipients as Array<{ email: string; name?: string }>) || [],
      includeCreator: data.include_creator as boolean,
      isActive: data.is_active as boolean,
      lastRunAt: data.last_run_at as string | null,
      nextRunAt: data.next_run_at as string | null,
      runCount: data.run_count as number,
      version: data.version as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapReportGeneration(data: Record<string, unknown>): ReportGeneration {
    return {
      id: data.id as string,
      scheduledReportId: data.scheduled_report_id as string | null,
      organizationId: data.organization_id as string,
      reportName: data.report_name as string,
      format: data.format as "pdf" | "excel" | "csv",
      version: data.version as number,
      status: data.status as ReportGenStatus,
      progress: data.progress as number,
      fileUrl: data.file_url as string | null,
      fileSizeBytes: data.file_size_bytes as number | null,
      pageCount: data.page_count as number | null,
      startedAt: data.started_at as string | null,
      completedAt: data.completed_at as string | null,
      errorMessage: data.error_message as string | null,
      deliveredTo: (data.delivered_to as string[]) || [],
      triggeredBy: data.triggered_by as "schedule" | "manual" | "api",
      createdAt: data.created_at as string,
    };
  }

  private mapReportTemplate(data: Record<string, unknown>): ReportTemplate {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string | null,
      name: data.name as string,
      description: data.description as string | null,
      layout: data.layout as ReportTemplate["layout"],
      headerConfig: data.header_config as ReportTemplate["headerConfig"],
      footerConfig: data.footer_config as ReportTemplate["footerConfig"],
      styles: data.styles as ReportTemplate["styles"],
      isDefault: data.is_default as boolean,
    };
  }
}

// =============================================
// Exports
// =============================================

export const scheduledReportService = new ScheduledReportService();
