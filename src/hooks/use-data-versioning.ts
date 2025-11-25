import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VersionedTableName, VersionHistoryItem, Json } from "@/types/database.types";

/**
 * Veri versiyonlama hook'u
 * - Kayıt geçmişini görüntüleme
 * - Belirli bir versiyona geri dönme
 * - Soft delete ve restore işlemleri
 */
export function useDataVersioning() {
  const supabase = createClient();

  /**
   * Bir kaydın versiyon geçmişini getirir
   */
  const getRecordHistory = useCallback(
    async (tableName: VersionedTableName, recordId: string, limit: number = 50) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_record_history", {
        p_table_name: tableName,
        p_record_id: recordId,
        p_limit: limit,
      });

      if (error) {
        console.error("Versiyon geçmişi alınamadı:", error);
        throw new Error(`Versiyon geçmişi alınamadı: ${error.message}`);
      }

      return data as VersionHistoryItem[];
    },
    [supabase]
  );

  /**
   * Kaydı belirli bir versiyona geri döndürür
   */
  const restoreToVersion = useCallback(
    async (tableName: VersionedTableName, recordId: string, version: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("restore_to_version", {
        p_table_name: tableName,
        p_record_id: recordId,
        p_version: version,
      });

      if (error) {
        console.error("Versiyona geri dönülemedi:", error);
        throw new Error(`Versiyona geri dönülemedi: ${error.message}`);
      }

      return data as Json;
    },
    [supabase]
  );

  /**
   * Kaydı soft delete ile siler
   */
  const softDelete = useCallback(
    async (tableName: VersionedTableName, recordId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("soft_delete", {
        p_table_name: tableName,
        p_record_id: recordId,
      });

      if (error) {
        console.error("Silme işlemi başarısız:", error);
        throw new Error(`Silme işlemi başarısız: ${error.message}`);
      }

      return data as boolean;
    },
    [supabase]
  );

  /**
   * Soft delete edilmiş kaydı geri yükler
   */
  const restoreDeleted = useCallback(
    async (tableName: VersionedTableName, recordId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("restore_deleted", {
        p_table_name: tableName,
        p_record_id: recordId,
      });

      if (error) {
        console.error("Geri yükleme başarısız:", error);
        throw new Error(`Geri yükleme başarısız: ${error.message}`);
      }

      return data as boolean;
    },
    [supabase]
  );

  /**
   * İki versiyon arasındaki farkları karşılaştırır
   */
  const compareVersions = useCallback(
    (oldData: Json, newData: Json): Record<string, { old: unknown; new: unknown }> => {
      const changes: Record<string, { old: unknown; new: unknown }> = {};

      if (!oldData || !newData) return changes;

      const oldObj = oldData as Record<string, unknown>;
      const newObj = newData as Record<string, unknown>;

      // Tüm anahtarları birleştir
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

      for (const key of allKeys) {
        // Sistem alanlarını atla
        if (["updated_at", "version", "created_at", "id"].includes(key)) continue;

        const oldValue = oldObj[key];
        const newValue = newObj[key];

        // JSON karşılaştırması
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[key] = { old: oldValue, new: newValue };
        }
      }

      return changes;
    },
    []
  );

  /**
   * Belirli bir tablodaki silinmiş kayıtları getirir
   */
  const getDeletedRecords = useCallback(
    async <T>(tableName: VersionedTableName) => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) {
        console.error("Silinmiş kayıtlar alınamadı:", error);
        throw new Error(`Silinmiş kayıtlar alınamadı: ${error.message}`);
      }

      return data as T[];
    },
    [supabase]
  );

  return {
    getRecordHistory,
    restoreToVersion,
    softDelete,
    restoreDeleted,
    compareVersions,
    getDeletedRecords,
  };
}

export default useDataVersioning;
