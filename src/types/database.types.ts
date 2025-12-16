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
