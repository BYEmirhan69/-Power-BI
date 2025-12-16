/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Route: Import Data
 * Doğrulanmış veriyi veritabanına kaydeder
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DataCategory } from "@/types/database.types";

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const supabase = await createClient() as any;
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Yetkilendirme gerekli" },
        { status: 401 }
      );
    }

    // Kullanıcı profilini al
    const { data: profile } = await supabase
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

    // Dataset oluştur
    const { data: dataset, error: datasetError } = await (supabase as any)
      .from("datasets")
      .insert({
        organization_id: profile.organization_id,
        data_source_id: dataSourceId || null,
        name,
        type: dataSourceType,
        description,
        schema,
        row_count: data.length,
        category: (category as DataCategory) || "other",
        created_by: user.id,
      })
      .select()
      .single();

    if (datasetError) {
      console.error("Dataset oluşturma hatası:", datasetError);
      return NextResponse.json(
        { success: false, error: "Dataset oluşturulamadı: " + datasetError.message },
        { status: 500 }
      );
    }

    // Verileri data_entries tablosuna kaydet
    // Büyük veri setleri için batch insert yapıyoruz
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(data.length / BATCH_SIZE);
    let _insertedRows = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, data.length);
      const batchData = data.slice(start, end);

      const entries = batchData.map((row: Record<string, unknown>, idx: number) => ({
        dataset_id: dataset.id,
        row_index: start + idx,
        data: row,
      }));

      const { error: entriesError } = await (supabase as any)
        .from("data_entries")
        .insert(entries);

      if (entriesError) {
        console.error(`Batch ${batchIndex + 1} insert hatası:`, entriesError);
        // Hata durumunda dataset'i sil (rollback)
        await (supabase as any).from("datasets").delete().eq("id", dataset.id);
        return NextResponse.json(
          { success: false, error: "Veri kaydetme hatası: " + entriesError.message },
          { status: 500 }
        );
      }

      _insertedRows += batchData.length;
    }

    // Activity log
    await (supabase as any).from("activity_logs").insert({
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
      },
    });

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
