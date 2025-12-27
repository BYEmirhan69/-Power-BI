/**
 * Worker Queue Service
 * Arka plan veri işleme, async job yönetimi
 * Queue, retry, dead-letter mantığı
 */

import { createClient } from "@/lib/supabase/client";
import type { Json, Database } from "@/types/database.types";

// =============================================
// Types
// =============================================

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";
export type JobPriority = "low" | "normal" | "high" | "critical";
export type JobType =
  | "data_import"
  | "data_export"
  | "report_generation"
  | "email_notification"
  | "data_sync"
  | "backup"
  | "cleanup"
  | "ai_analysis";

export interface Job {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  job_type: JobType;
  priority: JobPriority;
  payload: Json;
  status: JobStatus;
  progress: number;
  result: Json | null;
  error_message: string | null;
  max_retries: number;
  retry_count: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateJobOptions {
  organizationId?: string;
  userId?: string;
  jobType: JobType;
  priority?: JobPriority;
  payload: Record<string, unknown>;
  maxRetries?: number;
  retryDelayMs?: number;
  scheduledAt?: Date;
  idempotencyKey?: string;
  parentJobId?: string;
  metadata?: Record<string, unknown>;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  message?: string;
}

export interface DeadLetterItem {
  id: string;
  original_job_id: string;
  job_type: JobType;
  payload: Json;
  error_message: string | null;
  retry_count: number;
  failed_at: string;
  reviewed_at: string | null;
}

// =============================================
// Job Queue Service
// =============================================

export class JobQueueService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * Yeni job oluşturur
   */
  async createJob(options: CreateJobOptions): Promise<Job> {
    const {
      organizationId,
      userId,
      jobType,
      priority = "normal",
      payload,
      maxRetries = 3,
      retryDelayMs: _retryDelayMs = 5000, // Reserved for future retry logic
      scheduledAt,
      idempotencyKey,
      parentJobId: _parentJobId, // Reserved for job dependency tracking
      metadata = {},
    } = options;

    // Idempotency kontrolü
    if (idempotencyKey) {
      const { data: existing } = await this.supabase
        .from("job_queue")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (existing) {
        return existing as Job;
      }
    }

    const { data, error } = await this.supabase
      .from("job_queue")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        job_type: jobType,
        priority: priority === "low" ? 1 : priority === "normal" ? 2 : priority === "high" ? 3 : 4,
        payload: payload as Json,
        max_retries: maxRetries,
        scheduled_for: scheduledAt?.toISOString() || new Date().toISOString(),
        idempotency_key: idempotencyKey,
        metadata: metadata as Json,
      } as Database["public"]["Tables"]["job_queue"]["Insert"])
      .select()
      .single();

    if (error) {
      throw new Error(`Job oluşturulamadı: ${error.message}`);
    }

    return data as Job;
  }

  /**
   * Job durumunu getirir
   */
  async getJob(jobId: string): Promise<Job | null> {
    const { data, error } = await this.supabase
      .from("job_queue")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      return null;
    }

    return data as Job;
  }

  /**
   * Organizasyonun joblarını listeler
   */
  async listJobs(
    organizationId: string,
    options: {
      status?: JobStatus[];
      jobType?: JobType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ jobs: Job[]; total: number }> {
    const { status, jobType, limit = 50, offset = 0 } = options;

    let query = this.supabase
      .from("job_queue")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status.length > 0) {
      query = query.in("status", status);
    }

    if (jobType && jobType.length > 0) {
      query = query.in("job_type", jobType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Joblar listelenemedi: ${error.message}`);
    }

    return {
      jobs: (data || []) as Job[],
      total: count || 0,
    };
  }

  /**
   * Job ilerlemesini günceller
   */
  async updateProgress(jobId: string, progress: number, message?: string): Promise<void> {
    const { error } = await this.supabase
      .from("job_queue")
      .update({
        progress: Math.min(100, Math.max(0, progress)),
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["job_queue"]["Update"])
      .eq("id", jobId);

    if (error) {
      throw new Error(`İlerleme güncellenemedi: ${error.message}`);
    }

    // Log mesajı kaydet
    if (message) {
      await this.addJobLog(jobId, "info", message);
    }
  }

  /**
   * Job'ı iptal eder
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("job_queue")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["job_queue"]["Update"])
      .eq("id", jobId)
      .in("status", ["pending", "processing"])
      .select()
      .single();

    return !error && !!data;
  }

  /**
   * Job'ı yeniden dener (dead letter'dan)
   */
  async retryDeadLetterJob(deadLetterId: string): Promise<Job | null> {
    const { data: deadLetter, error: fetchError } = await this.supabase
      .from("dead_letter_queue")
      .select("*")
      .eq("id", deadLetterId)
      .single();

    if (fetchError || !deadLetter) {
      return null;
    }

    // Yeni job oluştur
    const newJob = await this.createJob({
      jobType: deadLetter.job_type as JobType,
      payload: deadLetter.payload as Record<string, unknown>,
      metadata: { retried_from_dead_letter: deadLetterId },
    });

    // Dead letter'ı işaretli olarak güncelle
    await this.supabase
      .from("dead_letter_queue")
      .update({
        reviewed_at: new Date().toISOString(),
        resolution: `Retried as job ${newJob.id}`,
      } as Database["public"]["Tables"]["dead_letter_queue"]["Update"])
      .eq("id", deadLetterId);

    return newJob;
  }

  /**
   * Dead letter queue'yu listeler
   */
  async listDeadLetterJobs(
    limit: number = 50,
    onlyUnreviewed: boolean = true
  ): Promise<DeadLetterItem[]> {
    let query = this.supabase
      .from("dead_letter_queue")
      .select("*")
      .order("failed_at", { ascending: false })
      .limit(limit);

    if (onlyUnreviewed) {
      query = query.is("reviewed_at", null);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Dead letter listelenemedi: ${error.message}`);
    }

    return (data || []) as DeadLetterItem[];
  }

  /**
   * Job loglarını getirir
   */
  async getJobLogs(
    jobId: string,
    limit: number = 100
  ): Promise<
    Array<{
      id: string;
      level: string;
      message: string;
      data: Json | null;
      created_at: string;
    }>
  > {
    const { data, error } = await this.supabase
      .from("job_logs")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return [];
    }

    return data || [];
  }

  /**
   * Job logu ekler
   */
  async addJobLog(
    jobId: string,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.supabase.from("job_logs").insert({
      job_id: jobId,
      level,
      message,
      data: (data || null) as Json,
    } as Database["public"]["Tables"]["job_logs"]["Insert"]);
  }

  /**
   * İstatistikleri getirir
   */
  async getQueueStats(organizationId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  }> {
    const statuses = ["pending", "processing", "completed", "failed", "dead_letter"] as const;
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await this.supabase
        .from("job_queue")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", status);

      stats[status] = count || 0;
    }

    return {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      deadLetter: stats.dead_letter,
    };
  }
}

// =============================================
// Job Handler Interface
// =============================================

export interface JobHandler<T = unknown> {
  type: JobType;
  handle(job: Job, payload: T): Promise<Json | void>;
  onProgress?: (progress: number, message?: string) => void;
  onError?: (error: Error) => void;
}

// =============================================
// Job Handlers Registry
// =============================================

const jobHandlers = new Map<JobType, JobHandler>();

export function registerJobHandler<T>(handler: JobHandler<T>): void {
  jobHandlers.set(handler.type, handler as JobHandler);
}

export function getJobHandler(type: JobType): JobHandler | undefined {
  return jobHandlers.get(type);
}

// =============================================
// Convenience Functions for Common Job Types
// =============================================

export const jobQueue = new JobQueueService();

/**
 * Veri import job'ı oluşturur
 */
export async function createDataImportJob(
  organizationId: string,
  userId: string,
  payload: {
    datasetId: string;
    sourceType: "csv" | "excel" | "api";
    sourceUrl?: string;
    fileData?: unknown;
    options?: Record<string, unknown>;
  }
): Promise<Job> {
  return jobQueue.createJob({
    organizationId,
    userId,
    jobType: "data_import",
    priority: "high",
    payload,
    maxRetries: 3,
    idempotencyKey: `import-${payload.datasetId}-${Date.now()}`,
  });
}

/**
 * Rapor üretim job'ı oluşturur
 */
export async function createReportGenerationJob(
  organizationId: string,
  userId: string,
  payload: {
    reportId?: string;
    dashboardId?: string;
    chartIds?: string[];
    format: "pdf" | "excel" | "csv";
    recipients?: string[];
    options?: Record<string, unknown>;
  }
): Promise<Job> {
  return jobQueue.createJob({
    organizationId,
    userId,
    jobType: "report_generation",
    priority: "normal",
    payload,
    maxRetries: 2,
  });
}

/**
 * Email bildirim job'ı oluşturur
 */
export async function createEmailNotificationJob(
  organizationId: string,
  payload: {
    templateName: string;
    toEmail: string;
    variables: Record<string, string>;
    attachments?: Array<{ filename: string; url: string }>;
  }
): Promise<Job> {
  return jobQueue.createJob({
    organizationId,
    jobType: "email_notification",
    priority: "normal",
    payload,
    maxRetries: 3,
    retryDelayMs: 30000, // 30 saniye
  });
}

/**
 * Veri senkronizasyon job'ı oluşturur
 */
export async function createDataSyncJob(
  organizationId: string,
  payload: {
    dataSourceId: string;
    syncType: "full" | "incremental";
    options?: Record<string, unknown>;
  }
): Promise<Job> {
  return jobQueue.createJob({
    organizationId,
    jobType: "data_sync",
    priority: "normal",
    payload,
    maxRetries: 3,
    idempotencyKey: `sync-${payload.dataSourceId}-${new Date().toISOString().slice(0, 10)}`,
  });
}

/**
 * AI analiz job'ı oluşturur
 */
export async function createAIAnalysisJob(
  organizationId: string,
  userId: string,
  payload: {
    analysisType: "chart_recommendation" | "anomaly_detection" | "nl_to_chart";
    datasetId?: string;
    query?: string;
    options?: Record<string, unknown>;
  }
): Promise<Job> {
  return jobQueue.createJob({
    organizationId,
    userId,
    jobType: "ai_analysis",
    priority: "low",
    payload,
    maxRetries: 2,
    retryDelayMs: 10000,
  });
}
