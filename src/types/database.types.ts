export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "user" | "developer";
export type DataSourceType = "api" | "csv" | "excel" | "scraping" | "manual";
export type ChartType = "line" | "bar" | "pie" | "area" | "scatter" | "heatmap" | "radar" | "combo";
export type DataCategory = "time_series" | "behavioral" | "technological" | "financial" | "other";
export type ReportFormat = "pdf" | "excel" | "csv";
export type NotificationType = "info" | "success" | "warning" | "error";
export type SyncStatus = "success" | "failed" | "pending";
export type VersionOperation = "INSERT" | "UPDATE" | "DELETE";
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

// Versiyonlanabilir tablo isimleri
export type VersionedTableName = "datasets" | "charts" | "dashboards" | "data_sources" | "reports";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_sources: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          type: DataSourceType;
          config: Json | null;
          credentials: Json | null;
          sync_schedule: string | null;
          last_sync_at: string | null;
          last_sync_status: SyncStatus | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          type: DataSourceType;
          config?: Json | null;
          credentials?: Json | null;
          sync_schedule?: string | null;
          last_sync_at?: string | null;
          last_sync_status?: SyncStatus | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          type?: DataSourceType;
          config?: Json | null;
          credentials?: Json | null;
          sync_schedule?: string | null;
          last_sync_at?: string | null;
          last_sync_status?: SyncStatus | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
      };
      datasets: {
        Row: {
          id: string;
          organization_id: string | null;
          data_source_id: string | null;
          name: string;
          type: string;
          description: string | null;
          schema: Json;
          row_count: number;
          file_url: string | null;
          category: DataCategory | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          data_source_id?: string | null;
          name: string;
          type: string;
          description?: string | null;
          schema?: Json;
          row_count?: number;
          file_url?: string | null;
          category?: DataCategory | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          data_source_id?: string | null;
          name?: string;
          type?: string;
          description?: string | null;
          schema?: Json;
          row_count?: number;
          file_url?: string | null;
          category?: DataCategory | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
      };
      charts: {
        Row: {
          id: string;
          organization_id: string;
          dataset_id: string | null;
          created_by: string;
          name: string;
          description: string | null;
          type: ChartType;
          config: Json;
          filters: Json | null;
          is_public: boolean;
          embed_token: string | null;
          thumbnail_url: string | null;
          view_count: number;
          created_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          dataset_id?: string | null;
          created_by: string;
          name: string;
          description?: string | null;
          type: ChartType;
          config?: Json;
          filters?: Json | null;
          is_public?: boolean;
          embed_token?: string | null;
          thumbnail_url?: string | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          dataset_id?: string;
          created_by?: string;
          name?: string;
          description?: string | null;
          type?: ChartType;
          config?: Json;
          filters?: Json | null;
          is_public?: boolean;
          embed_token?: string | null;
          thumbnail_url?: string | null;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
      };
      dashboards: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          name: string;
          description: string | null;
          layout: Json;
          theme: Json | null;
          filters: Json | null;
          is_default: boolean;
          is_public: boolean;
          embed_token: string | null;
          refresh_interval: number | null;
          created_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          name: string;
          description?: string | null;
          layout: Json;
          theme?: Json | null;
          filters?: Json | null;
          is_default?: boolean;
          is_public?: boolean;
          embed_token?: string | null;
          refresh_interval?: number | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string;
          name?: string;
          description?: string | null;
          layout?: Json;
          theme?: Json | null;
          filters?: Json | null;
          is_default?: boolean;
          is_public?: boolean;
          embed_token?: string | null;
          refresh_interval?: number | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
      };
      dashboard_charts: {
        Row: {
          id: string;
          dashboard_id: string;
          chart_id: string;
          position: Json;
          settings: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dashboard_id: string;
          chart_id: string;
          position?: Json;
          settings?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          dashboard_id?: string;
          chart_id?: string;
          position?: Json;
          settings?: Json | null;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          organization_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          entity_name: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          organization_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          entity_name?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          entity_name?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          organization_id: string;
          dashboard_id: string | null;
          created_by: string;
          name: string;
          description: string | null;
          format: ReportFormat;
          schedule: string | null;
          recipients: Json | null;
          last_generated_at: string | null;
          file_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          version: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          dashboard_id?: string | null;
          created_by: string;
          name: string;
          description?: string | null;
          format: ReportFormat;
          schedule?: string | null;
          recipients?: Json | null;
          last_generated_at?: string | null;
          file_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          dashboard_id?: string | null;
          created_by?: string;
          name?: string;
          description?: string | null;
          format?: ReportFormat;
          schedule?: string | null;
          recipients?: Json | null;
          last_generated_at?: string | null;
          file_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          version?: number;
          deleted_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          type: NotificationType;
          title: string;
          message: string | null;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          type: NotificationType;
          title: string;
          message?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          type?: NotificationType;
          title?: string;
          message?: string | null;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string;
          status: InvitationStatus;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          role?: UserRole;
          token?: string;
          invited_by: string;
          status?: InvitationStatus;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          invited_by?: string;
          status?: InvitationStatus;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_versions: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          version: number;
          operation: VersionOperation;
          old_data: Json | null;
          new_data: Json | null;
          changed_fields: string[] | null;
          changed_by: string | null;
          changed_at: string;
          change_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          version?: number;
          operation: VersionOperation;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          changed_by?: string | null;
          changed_at?: string;
          change_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          version?: number;
          operation?: VersionOperation;
          old_data?: Json | null;
          new_data?: Json | null;
          changed_fields?: string[] | null;
          changed_by?: string | null;
          changed_at?: string;
          change_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      data_entries: {
        Row: {
          id: string;
          dataset_id: string;
          row_index: number;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          row_index: number;
          data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          row_index?: number;
          data?: Json;
          created_at?: string;
        };
      };
      // ========================================
      // 2FA Tables
      // ========================================
      user_2fa: {
        Row: {
          id: string;
          user_id: string;
          secret_encrypted: string;
          backup_codes_encrypted: string;
          is_enabled: boolean;
          is_verified: boolean;
          enabled_at: string | null;
          last_used_at: string | null;
          recovery_codes_remaining: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          secret_encrypted: string;
          backup_codes_encrypted?: string;
          is_enabled?: boolean;
          is_verified?: boolean;
          enabled_at?: string | null;
          last_used_at?: string | null;
          recovery_codes_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          secret_encrypted?: string;
          backup_codes_encrypted?: string;
          is_enabled?: boolean;
          is_verified?: boolean;
          enabled_at?: string | null;
          last_used_at?: string | null;
          recovery_codes_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      two_factor_attempts: {
        Row: {
          id: string;
          user_id: string;
          attempt_type: string;
          success: boolean;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          attempt_type: string;
          success: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          attempt_type?: string;
          success?: boolean;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      // ========================================
      // Job Queue Tables
      // ========================================
      job_queue: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          job_type: string;
          priority: number;
          status: string;
          payload: Json;
          result: Json | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          idempotency_key: string | null;
          locked_at: string | null;
          locked_by: string | null;
          scheduled_for: string;
          started_at: string | null;
          completed_at: string | null;
          progress: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          job_type: string;
          priority?: number;
          status?: string;
          payload: Json;
          result?: Json | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          idempotency_key?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          scheduled_for?: string;
          started_at?: string | null;
          completed_at?: string | null;
          progress?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          job_type?: string;
          priority?: number;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          idempotency_key?: string | null;
          locked_at?: string | null;
          locked_by?: string | null;
          scheduled_for?: string;
          started_at?: string | null;
          completed_at?: string | null;
          progress?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dead_letter_queue: {
        Row: {
          id: string;
          original_job_id: string;
          job_type: string;
          payload: Json;
          error_message: string | null;
          stack_trace: string | null;
          retry_count: number;
          failed_at: string;
          reviewed_at: string | null;
          resolution: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_job_id: string;
          job_type: string;
          payload: Json;
          error_message?: string | null;
          stack_trace?: string | null;
          retry_count?: number;
          failed_at?: string;
          reviewed_at?: string | null;
          resolution?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          original_job_id?: string;
          job_type?: string;
          payload?: Json;
          error_message?: string | null;
          stack_trace?: string | null;
          retry_count?: number;
          failed_at?: string;
          reviewed_at?: string | null;
          resolution?: string | null;
          created_at?: string;
        };
      };
      job_logs: {
        Row: {
          id: string;
          job_id: string;
          level: string;
          message: string;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          level: string;
          message: string;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          level?: string;
          message?: string;
          data?: Json | null;
          created_at?: string;
        };
      };
      // ========================================
      // Cache Tables
      // ========================================
      chart_cache: {
        Row: {
          id: string;
          chart_id: string;
          cache_key: string;
          data: Json;
          filters_hash: string | null;
          hit_count: number;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chart_id: string;
          cache_key: string;
          data: Json;
          filters_hash?: string | null;
          hit_count?: number;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chart_id?: string;
          cache_key?: string;
          data?: Json;
          filters_hash?: string | null;
          hit_count?: number;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      query_cache: {
        Row: {
          id: string;
          organization_id: string;
          query_hash: string;
          query_text: string;
          result: Json;
          row_count: number | null;
          execution_time_ms: number | null;
          hit_count: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          query_hash: string;
          query_text: string;
          result: Json;
          row_count?: number | null;
          execution_time_ms?: number | null;
          hit_count?: number;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          query_hash?: string;
          query_text?: string;
          result?: Json;
          row_count?: number | null;
          execution_time_ms?: number | null;
          hit_count?: number;
          expires_at?: string;
          created_at?: string;
        };
      };
      dashboard_cache: {
        Row: {
          id: string;
          dashboard_id: string;
          cache_key: string;
          charts_data: Json;
          filters_hash: string | null;
          hit_count: number;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dashboard_id: string;
          cache_key: string;
          charts_data: Json;
          filters_hash?: string | null;
          hit_count?: number;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dashboard_id?: string;
          cache_key?: string;
          charts_data?: Json;
          filters_hash?: string | null;
          hit_count?: number;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ========================================
      // Security / Rate Limiting Tables
      // ========================================
      rate_limit_config: {
        Row: {
          id: string;
          endpoint: string;
          requests_per_window: number;
          window_seconds: number;
          burst_limit: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          endpoint: string;
          requests_per_window: number;
          window_seconds: number;
          burst_limit?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          endpoint?: string;
          requests_per_window?: number;
          window_seconds?: number;
          burst_limit?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      rate_limit_tracking: {
        Row: {
          id: string;
          identifier: string;
          identifier_type: string;
          endpoint: string;
          request_count: number;
          window_start: string;
          window_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          identifier_type: string;
          endpoint: string;
          request_count?: number;
          window_start: string;
          window_end: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          identifier_type?: string;
          endpoint?: string;
          request_count?: number;
          window_start?: string;
          window_end?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      blocked_ips: {
        Row: {
          id: string;
          ip_address: string;
          reason: string | null;
          blocked_at: string;
          blocked_until: string | null;
          permanent: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          reason?: string | null;
          blocked_at?: string;
          blocked_until?: string | null;
          permanent?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          reason?: string | null;
          blocked_at?: string;
          blocked_until?: string | null;
          permanent?: boolean;
          created_at?: string;
        };
      };
      ip_access_list: {
        Row: {
          id: string;
          ip_address: string;
          list_type: string;
          reason: string | null;
          organization_id: string | null;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ip_address: string;
          list_type: string;
          reason?: string | null;
          organization_id?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ip_address?: string;
          list_type?: string;
          reason?: string | null;
          organization_id?: string | null;
          expires_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      security_events: {
        Row: {
          id: string;
          event_type: string;
          severity: string;
          ip_address: string | null;
          user_id: string | null;
          endpoint: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          severity: string;
          ip_address?: string | null;
          user_id?: string | null;
          endpoint?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          severity?: string;
          ip_address?: string | null;
          user_id?: string | null;
          endpoint?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      // ========================================
      // Backup Tables
      // ========================================
      backup_config: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          backup_type: string;
          schedule: string | null;
          retention_days: number;
          include_tables: string[] | null;
          exclude_tables: string[] | null;
          storage_path: string | null;
          encryption_enabled: boolean;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          backup_type: string;
          schedule?: string | null;
          retention_days?: number;
          include_tables?: string[] | null;
          exclude_tables?: string[] | null;
          storage_path?: string | null;
          encryption_enabled?: boolean;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          backup_type?: string;
          schedule?: string | null;
          retention_days?: number;
          include_tables?: string[] | null;
          exclude_tables?: string[] | null;
          storage_path?: string | null;
          encryption_enabled?: boolean;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      backup_history: {
        Row: {
          id: string;
          config_id: string | null;
          organization_id: string;
          backup_type: string;
          status: string;
          file_path: string | null;
          file_size_bytes: number | null;
          tables_included: string[];
          row_counts: Json | null;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          triggered_by: string;
          triggered_by_user: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          config_id?: string | null;
          organization_id: string;
          backup_type: string;
          status?: string;
          file_path?: string | null;
          file_size_bytes?: number | null;
          tables_included: string[];
          row_counts?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          triggered_by: string;
          triggered_by_user?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          config_id?: string | null;
          organization_id?: string;
          backup_type?: string;
          status?: string;
          file_path?: string | null;
          file_size_bytes?: number | null;
          tables_included?: string[];
          row_counts?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          triggered_by?: string;
          triggered_by_user?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      restore_history: {
        Row: {
          id: string;
          backup_id: string;
          organization_id: string;
          status: string;
          tables_restored: string[];
          rows_restored: Json | null;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          restored_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          backup_id: string;
          organization_id: string;
          status?: string;
          tables_restored?: string[];
          rows_restored?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          restored_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          backup_id?: string;
          organization_id?: string;
          status?: string;
          tables_restored?: string[];
          rows_restored?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          restored_by?: string;
          created_at?: string;
        };
      };
      pitr_markers: {
        Row: {
          id: string;
          organization_id: string;
          marker_name: string;
          description: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          marker_name: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          marker_name?: string;
          description?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      // ========================================
      // Email Tables
      // ========================================
      email_templates: {
        Row: {
          id: string;
          name: string;
          slug: string;
          subject: string;
          html_body: string;
          text_body: string | null;
          variables: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          subject: string;
          html_body: string;
          text_body?: string | null;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          subject?: string;
          html_body?: string;
          text_body?: string | null;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_queue: {
        Row: {
          id: string;
          template_id: string | null;
          to_email: string;
          to_name: string | null;
          subject: string;
          html_body: string;
          text_body: string | null;
          variables: Json | null;
          status: string;
          priority: number;
          scheduled_for: string;
          sent_at: string | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          to_email: string;
          to_name?: string | null;
          subject: string;
          html_body: string;
          text_body?: string | null;
          variables?: Json | null;
          status?: string;
          priority?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string | null;
          to_email?: string;
          to_name?: string | null;
          subject?: string;
          html_body?: string;
          text_body?: string | null;
          variables?: Json | null;
          status?: string;
          priority?: number;
          scheduled_for?: string;
          sent_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          max_retries?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          queue_id: string | null;
          to_email: string;
          subject: string;
          status: string;
          provider: string | null;
          provider_message_id: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          bounced_at: string | null;
          error_message: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          queue_id?: string | null;
          to_email: string;
          subject: string;
          status: string;
          provider?: string | null;
          provider_message_id?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          bounced_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          queue_id?: string | null;
          to_email?: string;
          subject?: string;
          status?: string;
          provider?: string | null;
          provider_message_id?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          bounced_at?: string | null;
          error_message?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      email_preferences: {
        Row: {
          id: string;
          user_id: string;
          marketing: boolean;
          product_updates: boolean;
          security_alerts: boolean;
          weekly_digest: boolean;
          report_notifications: boolean;
          collaboration_notifications: boolean;
          unsubscribed_all: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          marketing?: boolean;
          product_updates?: boolean;
          security_alerts?: boolean;
          weekly_digest?: boolean;
          report_notifications?: boolean;
          collaboration_notifications?: boolean;
          unsubscribed_all?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          marketing?: boolean;
          product_updates?: boolean;
          security_alerts?: boolean;
          weekly_digest?: boolean;
          report_notifications?: boolean;
          collaboration_notifications?: boolean;
          unsubscribed_all?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ========================================
      // Scheduled Reports Tables
      // ========================================
      scheduled_reports: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          name: string;
          description: string | null;
          dashboard_id: string | null;
          chart_ids: string[];
          format: string;
          include_charts: boolean;
          include_data_tables: boolean;
          date_range_type: string | null;
          custom_date_range: Json | null;
          filters: Json | null;
          frequency: string;
          cron_expression: string | null;
          timezone: string;
          day_of_week: number | null;
          day_of_month: number | null;
          hour_of_day: number;
          minute_of_hour: number;
          recipients: Json;
          include_creator: boolean;
          is_active: boolean;
          last_run_at: string | null;
          next_run_at: string | null;
          run_count: number;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          name: string;
          description?: string | null;
          dashboard_id?: string | null;
          chart_ids?: string[];
          format?: string;
          include_charts?: boolean;
          include_data_tables?: boolean;
          date_range_type?: string | null;
          custom_date_range?: Json | null;
          filters?: Json | null;
          frequency: string;
          cron_expression?: string | null;
          timezone?: string;
          day_of_week?: number | null;
          day_of_month?: number | null;
          hour_of_day?: number;
          minute_of_hour?: number;
          recipients: Json;
          include_creator?: boolean;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          run_count?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string;
          name?: string;
          description?: string | null;
          dashboard_id?: string | null;
          chart_ids?: string[];
          format?: string;
          include_charts?: boolean;
          include_data_tables?: boolean;
          date_range_type?: string | null;
          custom_date_range?: Json | null;
          filters?: Json | null;
          frequency?: string;
          cron_expression?: string | null;
          timezone?: string;
          day_of_week?: number | null;
          day_of_month?: number | null;
          hour_of_day?: number;
          minute_of_hour?: number;
          recipients?: Json;
          include_creator?: boolean;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          run_count?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      report_generations: {
        Row: {
          id: string;
          scheduled_report_id: string | null;
          organization_id: string;
          report_name: string;
          format: string;
          version: number;
          status: string;
          progress: number;
          file_url: string | null;
          file_size_bytes: number | null;
          page_count: number | null;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          delivered_to: string[];
          triggered_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          scheduled_report_id?: string | null;
          organization_id: string;
          report_name: string;
          format?: string;
          version?: number;
          status?: string;
          progress?: number;
          file_url?: string | null;
          file_size_bytes?: number | null;
          page_count?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          delivered_to?: string[];
          triggered_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          scheduled_report_id?: string | null;
          organization_id?: string;
          report_name?: string;
          format?: string;
          version?: number;
          status?: string;
          progress?: number;
          file_url?: string | null;
          file_size_bytes?: number | null;
          page_count?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          delivered_to?: string[];
          triggered_by?: string;
          created_at?: string;
        };
      };
      report_templates: {
        Row: {
          id: string;
          organization_id: string | null;
          name: string;
          description: string | null;
          layout: Json;
          header_config: Json | null;
          footer_config: Json | null;
          styles: Json | null;
          is_default: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          name: string;
          description?: string | null;
          layout: Json;
          header_config?: Json | null;
          footer_config?: Json | null;
          styles?: Json | null;
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          name?: string;
          description?: string | null;
          layout?: Json;
          header_config?: Json | null;
          footer_config?: Json | null;
          styles?: Json | null;
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ========================================
      // AI Features Tables
      // ========================================
      ai_config: {
        Row: {
          id: string;
          organization_id: string;
          feature: string;
          is_enabled: boolean;
          model: string | null;
          config: Json | null;
          usage_limit_daily: number | null;
          usage_count_today: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feature: string;
          is_enabled?: boolean;
          model?: string | null;
          config?: Json | null;
          usage_limit_daily?: number | null;
          usage_count_today?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          feature?: string;
          is_enabled?: boolean;
          model?: string | null;
          config?: Json | null;
          usage_limit_daily?: number | null;
          usage_count_today?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_suggestions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          suggestion_type: string;
          target_type: string;
          target_id: string;
          title: string;
          description: string;
          suggested_action: Json | null;
          expected_impact: string | null;
          confidence: number;
          status: string;
          applied_at: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          suggestion_type: string;
          target_type: string;
          target_id: string;
          title: string;
          description: string;
          suggested_action?: Json | null;
          expected_impact?: string | null;
          confidence?: number;
          status?: string;
          applied_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          suggestion_type?: string;
          target_type?: string;
          target_id?: string;
          title?: string;
          description?: string;
          suggested_action?: Json | null;
          expected_impact?: string | null;
          confidence?: number;
          status?: string;
          applied_at?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      anomaly_detections: {
        Row: {
          id: string;
          dataset_id: string;
          chart_id: string | null;
          detected_at: string;
          metric: string;
          value: number;
          expected_range: Json;
          deviation: number;
          severity: string;
          description: string;
          possible_causes: string[];
          suggested_actions: string[];
          acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          false_positive: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          chart_id?: string | null;
          detected_at?: string;
          metric: string;
          value: number;
          expected_range: Json;
          deviation: number;
          severity: string;
          description: string;
          possible_causes?: string[];
          suggested_actions?: string[];
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          false_positive?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          chart_id?: string | null;
          detected_at?: string;
          metric?: string;
          value?: number;
          expected_range?: Json;
          deviation?: number;
          severity?: string;
          description?: string;
          possible_causes?: string[];
          suggested_actions?: string[];
          acknowledged?: boolean;
          acknowledged_by?: string | null;
          acknowledged_at?: string | null;
          false_positive?: boolean;
          created_at?: string;
        };
      };
      nl_queries: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          query: string;
          parsed_intent: Json;
          generated_chart_config: Json | null;
          confidence: number;
          was_successful: boolean;
          processing_time_ms: number;
          feedback_rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          query: string;
          parsed_intent: Json;
          generated_chart_config?: Json | null;
          confidence?: number;
          was_successful?: boolean;
          processing_time_ms?: number;
          feedback_rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          query?: string;
          parsed_intent?: Json;
          generated_chart_config?: Json | null;
          confidence?: number;
          was_successful?: boolean;
          processing_time_ms?: number;
          feedback_rating?: number | null;
          created_at?: string;
        };
      };
      chart_recommendations_cache: {
        Row: {
          id: string;
          cache_key: string;
          data_signature: string;
          recommendation: Json;
          hit_count: number;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          data_signature: string;
          recommendation: Json;
          hit_count?: number;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          data_signature?: string;
          recommendation?: Json;
          hit_count?: number;
          created_at?: string;
          expires_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_record_history: {
        Args: {
          p_table_name: string;
          p_record_id: string;
          p_limit?: number;
        };
        Returns: {
          version: number;
          operation: string;
          old_data: Json;
          new_data: Json;
          changed_fields: string[];
          changed_by: string;
          changed_by_name: string;
          changed_at: string;
        }[];
      };
      restore_to_version: {
        Args: {
          p_table_name: string;
          p_record_id: string;
          p_version: number;
        };
        Returns: Json;
      };
      soft_delete: {
        Args: {
          p_table_name: string;
          p_record_id: string;
        };
        Returns: boolean;
      };
      restore_deleted: {
        Args: {
          p_table_name: string;
          p_record_id: string;
        };
        Returns: boolean;
      };
      // Cache Functions
      get_or_set_chart_cache: {
        Args: {
          p_chart_id: string;
          p_cache_key: string;
          p_data: Json | null;
          p_ttl_seconds: number;
        };
        Returns: { hit: boolean; data: Json | null };
      };
      invalidate_chart_cache: {
        Args: {
          p_chart_id: string;
          p_reason: string;
        };
        Returns: number;
      };
      invalidate_dataset_caches: {
        Args: {
          p_dataset_id: string;
          p_reason: string;
        };
        Returns: number;
      };
      // Rate Limiting Functions
      check_rate_limit: {
        Args: {
          p_identifier: string;
          p_identifier_type: string;
          p_endpoint: string;
        };
        Returns: { allowed: boolean; remaining: number; reset_at: string };
      };
      block_ip: {
        Args: {
          p_ip_address: string;
          p_reason: string;
          p_duration_hours: number;
          p_permanent: boolean;
        };
        Returns: boolean;
      };
      // Job Queue Functions
      acquire_next_job: {
        Args: {
          p_worker_id: string;
          p_job_types?: string[];
        };
        Returns: Json | null;
      };
      complete_job: {
        Args: {
          p_job_id: string;
          p_result: Json;
        };
        Returns: boolean;
      };
      fail_job: {
        Args: {
          p_job_id: string;
          p_error_message: string;
          p_stack_trace?: string;
        };
        Returns: boolean;
      };
      // Report Functions
      create_report_generation: {
        Args: {
          p_scheduled_report_id?: string;
          p_organization_id: string;
          p_report_name?: string;
          p_format?: string;
          p_dashboard_id?: string;
          p_chart_ids?: string[];
          p_parameters?: Json;
          p_triggered_by?: string;
          p_user_id?: string;
        };
        Returns: string;
      };
      complete_report_generation: {
        Args: {
          p_generation_id: string;
          p_file_url: string;
          p_file_size: number;
          p_page_count?: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      data_source_type: DataSourceType;
      chart_type: ChartType;
      data_category: DataCategory;
      report_format: ReportFormat;
      notification_type: NotificationType;
      sync_status: SyncStatus;
      version_operation: VersionOperation;
      invitation_status: InvitationStatus;
    };
  };
}

// Helper types for easier usage
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type DataSource = Database["public"]["Tables"]["data_sources"]["Row"];
export type Dataset = Database["public"]["Tables"]["datasets"]["Row"];
export type Chart = Database["public"]["Tables"]["charts"]["Row"];
export type Dashboard = Database["public"]["Tables"]["dashboards"]["Row"];
export type DashboardChart = Database["public"]["Tables"]["dashboard_charts"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];
export type DataVersion = Database["public"]["Tables"]["data_versions"]["Row"];
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"];
export type DataEntry = Database["public"]["Tables"]["data_entries"]["Row"];

// Version history item type
export interface VersionHistoryItem {
  version: number;
  operation: VersionOperation;
  old_data: Json;
  new_data: Json;
  changed_fields: string[];
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
}
