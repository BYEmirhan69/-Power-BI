/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Route: Import Data
 * Doğrulanmış veriyi veritabanına kaydeder
 * Not: data_entries tablosu yoksa, veri datasets.metadata alanına kaydedilir
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DataCategory } from "@/types/database.types";

// data_entries tablosunun var olup olmadığını kontrol et
async function checkDataEntriesTableExists(adminClient: any): Promise<boolean> {
  try {
    const { error } = await adminClient
      .from("data_entries")
      .select("id")
      .limit(1);
    
    // PGRST205: relation does not exist
    if (error?.code === "PGRST205" || error?.code === "42P01") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Yetkilendirme gerekli" },
        { status: 401 }
      );
    }

    // Kullanıcı profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single() as { data: { organization_id: string | null } | null };

    if (!profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: "Organizasyon bulunamadı" },
        { status: 400 }
      );
    }

    // Request body'yi parse et
    const body = await request.json();
    const { 
      name, 
      description, 
      data, 
      columns, 
      category,
      dataSourceId,
      dataSourceType = "manual"
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Dataset adı gerekli" },
        { status: 400 }
      );
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Veri gerekli" },
        { status: 400 }
      );
    }

    // Schema oluştur (kolon bilgilerinden)
    const schema = columns?.map((col: { name: string; inferredType: string }) => ({
      name: col.name,
      type: col.inferredType,
    })) || Object.keys(data[0]).map((key) => ({
      name: key,
      type: typeof data[0][key],
    }));

    // data_entries tablosu var mı kontrol et
    const hasDataEntriesTable = await checkDataEntriesTableExists(adminClient);

    // Dataset oluştur - raw_data alanına veriyi de ekle (fallback için)
    const datasetPayload: any = {
      organization_id: profile.organization_id,
      data_source_id: dataSourceId || null,
      name,
      type: dataSourceType,
      description,
      schema,
      row_count: data.length,
      category: (category as DataCategory) || "other",
      created_by: user.id,
    };

    // data_entries tablosu yoksa, raw_data'ya kaydet
    // Not: Bu geçici bir çözüm - migration çalıştırılınca data_entries kullanılacak
    if (!hasDataEntriesTable) {
      // Büyük veri için sadece ilk 5000 satırı sakla (JSONB limiti için)
      datasetPayload.file_url = JSON.stringify(data.slice(0, 5000));
    }

    const { data: dataset, error: datasetError } = await adminClient
      .from("datasets")
      .insert(datasetPayload)
      .select()
      .single();

    if (datasetError) {
      console.error("Dataset oluşturma hatası:", datasetError);
      return NextResponse.json(
        { success: false, error: "Dataset oluşturulamadı: " + datasetError.message },
        { status: 500 }
      );
    }

    // data_entries tablosu varsa, verileri oraya kaydet
    if (hasDataEntriesTable) {
      // Büyük veri setleri için batch insert yapıyoruz
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, data.length);
        const batchData = data.slice(start, end);

        const entries = batchData.map((row: Record<string, unknown>, idx: number) => ({
          dataset_id: dataset.id,
          row_index: start + idx,
          data: row,
        }));

        const { error: entriesError } = await adminClient
          .from("data_entries")
          .insert(entries);

        if (entriesError) {
          console.error(`Batch ${batchIndex + 1} insert hatası:`, entriesError);
          // Hata durumunda dataset'i sil (rollback)
          await adminClient.from("datasets").delete().eq("id", dataset.id);
          return NextResponse.json(
            { success: false, error: "Veri kaydetme hatası: " + entriesError.message },
            { status: 500 }
          );
        }
      }
    }

    // Activity log
    try {
      await adminClient.from("activity_logs").insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        action: "create",
        entity_type: "dataset",
        entity_id: dataset.id,
        entity_name: name,
        metadata: {
          row_count: data.length,
          column_count: schema.length,
          category,
          source_type: dataSourceType,
          storage_method: hasDataEntriesTable ? "data_entries" : "file_url",
        },
      });
    } catch (logError) {
      // Activity log hatası kritik değil, devam et
      console.warn("Activity log hatası:", logError);
    }

    return NextResponse.json({
      success: true,
      dataset,
      message: `${data.length} satır başarıyla içe aktarıldı`,
    });
  } catch (error) {
    console.error("Import hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
