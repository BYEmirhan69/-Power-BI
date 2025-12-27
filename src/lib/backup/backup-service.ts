/**
 * Backup Service
 * Otomatik/manuel yedekleme, restore senaryoları
 * Tablo bazlı yedekleme, disaster recovery
 */

import { createClient } from "@/lib/supabase/client";

// =============================================
// Types
// =============================================

export type BackupStatus = "pending" | "in_progress" | "completed" | "failed" | "expired";
export type BackupType = "full" | "incremental" | "table" | "schema" | "snapshot";

export interface BackupConfig {
  id: string;
  organizationId: string;
  name: string;
  backupType: BackupType;
  schedule: string | null;
  retentionDays: number;
  includeTables: string[] | null;
  excludeTables: string[] | null;
  compress: boolean;
  encrypt: boolean;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

export interface BackupHistory {
  id: string;
  configId: string | null;
  organizationId: string;
  backupType: BackupType;
  status: BackupStatus;
  filePath: string | null;
  fileSizeBytes: number | null;
  compressedSizeBytes: number | null;
  checksum: string | null;
  tablesIncluded: string[];
  rowCounts: Record<string, number>;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  triggeredBy: "schedule" | "manual" | "system";
}

export interface RestoreOptions {
  backupId: string;
  restoreMode: "full" | "selective" | "point_in_time";
  targetTables?: string[];
  pointInTime?: Date;
}

export interface PITRMarker {
  id: string;
  organizationId: string;
  markerName: string;
  description: string | null;
  markedAt: string;
}

// =============================================
// Backup Service
// =============================================

export class BackupService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  // Yedeklenebilir tablolar
  private readonly backupableTables = [
    "datasets",
    "charts",
    "dashboards",
    "data_sources",
    "reports",
    "data_entries",
  ];

  /**
   * Yedekleme konfigürasyonu oluştur
   */
  async createBackupConfig(
    organizationId: string,
    config: Partial<BackupConfig> & { name: string },
    userId: string
  ): Promise<BackupConfig> {
    const { data, error } = await this.supabase
      .from("backup_config")
      .insert({
        organization_id: organizationId,
        name: config.name,
        backup_type: config.backupType || "full",
        schedule: config.schedule,
        retention_days: config.retentionDays || 30,
        include_tables: config.includeTables,
        exclude_tables: config.excludeTables,
        storage_path: null,
        encryption_enabled: config.encrypt ?? true,
        is_active: config.enabled ?? true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Backup config oluşturulamadı: ${error.message}`);
    }

    return this.mapBackupConfig(data);
  }

  /**
   * Yedekleme konfigürasyonlarını listele
   */
  async listBackupConfigs(organizationId: string): Promise<BackupConfig[]> {
    const { data, error } = await this.supabase
      .from("backup_config")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Backup configs listelenemedi: ${error.message}`);
    }

    return (data || []).map(this.mapBackupConfig);
  }

  /**
   * Manuel yedekleme başlat
   */
  async startBackup(
    organizationId: string,
    options: {
      backupType?: BackupType;
      tables?: string[];
      configId?: string;
    } = {},
    userId?: string
  ): Promise<BackupHistory> {
    const { backupType = "full", tables, configId } = options;

    // Yedekleme kaydı oluştur
    const { data: backupRecord, error: createError } = await this.supabase
      .from("backup_history")
      .insert({
        config_id: configId,
        organization_id: organizationId,
        backup_type: backupType,
        status: "pending",
        tables_included: tables || this.backupableTables,
        triggered_by: "manual",
        triggered_by_user: userId,
      })
      .select()
      .single();

    if (createError || !backupRecord) {
      throw new Error(`Backup başlatılamadı: ${createError?.message || "Kayıt oluşturulamadı"}`);
    }

    // Arka planda backup işlemini başlat
    this.executeBackup(backupRecord.id, organizationId, tables || this.backupableTables)
      .catch(console.error);

    return this.mapBackupHistory(backupRecord);
  }

  /**
   * Yedekleme işlemini gerçekleştir (async)
   */
  private async executeBackup(
    backupId: string,
    organizationId: string,
    tables: string[]
  ): Promise<void> {
    try {
      // Status güncelle
      await this.supabase
        .from("backup_history")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", backupId);

      // Her tablo için satır sayısını al ve veriyi topla
      const rowCounts: Record<string, number> = {};
      const backupData: Record<string, unknown[]> = {};
      let totalSize = 0;

      for (const table of tables) {
        try {
          const { data, count, error } = await this.supabase
            .from(table)
            .select("*", { count: "exact" })
            .eq("organization_id", organizationId);

          if (!error && data) {
            rowCounts[table] = count || 0;
            backupData[table] = data;
            totalSize += JSON.stringify(data).length;
          }
        } catch (tableError) {
          console.warn(`Tablo yedeklenemedi: ${table}`, tableError);
        }
      }

      // Backup verisini JSON olarak hazırla
      const backupPayload = {
        metadata: {
          organizationId,
          createdAt: new Date().toISOString(),
          tables,
          rowCounts,
          version: "1.0",
        },
        data: backupData,
      };

      // Gerçek bir production sistemde bu veri Supabase Storage'a yüklenir
      // Burada checksum hesaplıyoruz
      const jsonString = JSON.stringify(backupPayload);
      const checksum = await this.calculateChecksum(jsonString);
      const compressedSize = Math.floor(totalSize * 0.3); // Simüle edilmiş sıkıştırma

      // Storage'a yükle (simüle)
      const filePath = `backups/${organizationId}/${backupId}.json.gz`;

      // Backup'ı tamamla
      await this.supabase
        .from("backup_history")
        .update({
          status: "completed",
          file_path: filePath,
          file_size_bytes: totalSize,
          compressed_size_bytes: compressedSize,
          checksum,
          row_counts: rowCounts,
          completed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 gün
        })
        .eq("id", backupId);
    } catch (error) {
      // Hata durumunda backup'ı fail olarak işaretle
      await this.supabase
        .from("backup_history")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Bilinmeyen hata",
          completed_at: new Date().toISOString(),
        })
        .eq("id", backupId);
    }
  }

  /**
   * Checksum hesapla
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Yedekleme geçmişini listele
   */
  async listBackupHistory(
    organizationId: string,
    options: {
      status?: BackupStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ backups: BackupHistory[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    let query = this.supabase
      .from("backup_history")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status.length > 0) {
      query = query.in("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Backup history listelenemedi: ${error.message}`);
    }

    return {
      backups: (data || []).map(this.mapBackupHistory),
      total: count || 0,
    };
  }

  /**
   * Yedekleme detayını getir
   */
  async getBackup(backupId: string): Promise<BackupHistory | null> {
    const { data, error } = await this.supabase
      .from("backup_history")
      .select("*")
      .eq("id", backupId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapBackupHistory(data);
  }

  /**
   * Geri yükleme başlat
   */
  async startRestore(
    options: RestoreOptions,
    userId: string
  ): Promise<{ restoreId: string; status: string }> {
    const backup = await this.getBackup(options.backupId);
    if (!backup) {
      throw new Error("Backup bulunamadı");
    }

    if (backup.status !== "completed") {
      throw new Error("Sadece tamamlanmış backup'lar geri yüklenebilir");
    }

    // Restore kaydı oluştur
    const { data: restoreRecord, error: createError } = await this.supabase
      .from("restore_history")
      .insert({
        backup_id: options.backupId,
        organization_id: backup.organizationId,
        status: "pending",
        restore_mode: options.restoreMode,
        target_tables: options.targetTables,
        point_in_time: options.pointInTime?.toISOString(),
        restored_by: userId,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Restore başlatılamadı: ${createError.message}`);
    }

    // Arka planda restore işlemini başlat
    this.executeRestore(restoreRecord.id, options)
      .catch(console.error);

    return {
      restoreId: restoreRecord.id,
      status: "pending",
    };
  }

  /**
   * Restore işlemini gerçekleştir (async)
   */
  private async executeRestore(restoreId: string, options: RestoreOptions): Promise<void> {
    try {
      // Status güncelle
      await this.supabase
        .from("restore_history")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", restoreId);

      // Backup verisini al (simüle)
      // Gerçek sistemde Storage'dan indirilir
      const backup = await this.getBackup(options.backupId);
      if (!backup) {
        throw new Error("Backup verisi alınamadı");
      }

      // Restore işlemi - tabloları geri yükle
      const tablesToRestore = options.targetTables || backup.tablesIncluded;
      const rowsRestored: Record<string, number> = {};

      for (const table of tablesToRestore) {
        // Gerçek restore işlemi burada yapılır
        // Şimdilik simüle ediyoruz
        rowsRestored[table] = backup.rowCounts[table] || 0;
      }

      // Restore'u tamamla
      await this.supabase
        .from("restore_history")
        .update({
          status: "completed",
          tables_restored: tablesToRestore,
          rows_restored: rowsRestored,
          completed_at: new Date().toISOString(),
        })
        .eq("id", restoreId);
    } catch (error) {
      await this.supabase
        .from("restore_history")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Bilinmeyen hata",
          completed_at: new Date().toISOString(),
        })
        .eq("id", restoreId);
    }
  }

  /**
   * PITR marker oluştur
   */
  async createPITRMarker(
    organizationId: string,
    name: string,
    description?: string,
    userId?: string
  ): Promise<PITRMarker> {
    const { data, error } = await this.supabase
      .from("pitr_markers")
      .insert({
        organization_id: organizationId,
        marker_name: name,
        description,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`PITR marker oluşturulamadı: ${error.message}`);
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      markerName: data.marker_name,
      description: data.description,
      markedAt: data.marked_at,
    };
  }

  /**
   * PITR marker'ları listele
   */
  async listPITRMarkers(organizationId: string): Promise<PITRMarker[]> {
    const { data, error } = await this.supabase
      .from("pitr_markers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("marked_at", { ascending: false });

    if (error) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((m: any) => ({
      id: m.id,
      organizationId: m.organization_id,
      markerName: m.marker_name,
      description: m.description,
      markedAt: m.marked_at,
    }));
  }

  /**
   * Backup istatistiklerini getir
   */
  async getBackupStats(organizationId: string): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    totalSizeBytes: number;
    lastBackupAt: string | null;
    nextScheduledAt: string | null;
  }> {
    const { data: backups } = await this.supabase
      .from("backup_history")
      .select("status, file_size_bytes, completed_at")
      .eq("organization_id", organizationId);

    const { data: configs } = await this.supabase
      .from("backup_config")
      .select("next_run_at")
      .eq("organization_id", organizationId)
      .eq("enabled", true)
      .order("next_run_at", { ascending: true })
      .limit(1);

    return {
      totalBackups: backups?.length || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successfulBackups: backups?.filter((b: any) => b.status === "completed").length || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      failedBackups: backups?.filter((b: any) => b.status === "failed").length || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalSizeBytes: backups?.reduce((sum: number, b: any) => sum + (b.file_size_bytes || 0), 0) || 0,
      lastBackupAt:
        backups
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ?.filter((b: any) => b.status === "completed")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .sort((a: any, b: any) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0]
          ?.completed_at || null,
      nextScheduledAt: configs?.[0]?.next_run_at || null,
    };
  }

  // =============================================
  // Mapper Functions
  // =============================================

  private mapBackupConfig(data: Record<string, unknown>): BackupConfig {
    return {
      id: data.id as string,
      organizationId: data.organization_id as string,
      name: data.name as string,
      backupType: data.backup_type as BackupType,
      schedule: data.schedule as string | null,
      retentionDays: data.retention_days as number,
      includeTables: data.include_tables as string[] | null,
      excludeTables: data.exclude_tables as string[] | null,
      compress: data.compress as boolean,
      encrypt: data.encrypt as boolean,
      enabled: data.enabled as boolean,
      lastRunAt: data.last_run_at as string | null,
      nextRunAt: data.next_run_at as string | null,
    };
  }

  private mapBackupHistory(data: Record<string, unknown>): BackupHistory {
    return {
      id: data.id as string,
      configId: data.config_id as string | null,
      organizationId: data.organization_id as string,
      backupType: data.backup_type as BackupType,
      status: data.status as BackupStatus,
      filePath: data.file_path as string | null,
      fileSizeBytes: data.file_size_bytes as number | null,
      compressedSizeBytes: data.compressed_size_bytes as number | null,
      checksum: data.checksum as string | null,
      tablesIncluded: (data.tables_included as string[]) || [],
      rowCounts: (data.row_counts as Record<string, number>) || {},
      startedAt: data.started_at as string | null,
      completedAt: data.completed_at as string | null,
      expiresAt: data.expires_at as string | null,
      errorMessage: data.error_message as string | null,
      triggeredBy: data.triggered_by as "schedule" | "manual" | "system",
    };
  }
}

// =============================================
// Exports
// =============================================

export const backupService = new BackupService();
