/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface DataEntry {
  row_index: number;
  data: Record<string, any>;
}

interface Dataset {
  id: string;
  name: string;
  schema: any;
  row_count: number;
  organization_id: string;
}

interface Profile {
  id: string;
  organization_id: string;
  [key: string]: any;
}

// Dataset verilerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single() as { data: Profile | null };

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Dataset'in bu organizasyona ait olduğunu kontrol et
    const { data: dataset, error: datasetError } = await adminClient
      .from("datasets")
      .select("id, name, schema, row_count, organization_id")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single() as { data: Dataset | null; error: any };

    if (datasetError || !dataset) {
      return NextResponse.json({ error: "Dataset bulunamadı" }, { status: 404 });
    }

    // Query parametrelerini al
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");
    const offset = parseInt(searchParams.get("offset") || "0");
    const orderBy = searchParams.get("orderBy") || "row_index";
    const orderDir = searchParams.get("orderDir") !== "desc";

    // Data entries'leri al
    const { data: entries, error: entriesError, count } = await adminClient
      .from("data_entries")
      .select("row_index, data", { count: "exact" })
      .eq("dataset_id", id)
      .order(orderBy, { ascending: orderDir })
      .range(offset, offset + limit - 1) as { data: DataEntry[] | null; error: any; count: number | null };

    // Tablo bulunamadı veya başka hata durumunda boş veri dön
    if (entriesError) {
      // PGRST205: Tablo bulunamadı - migration çalıştırılmamış olabilir
      if (entriesError.code === "PGRST205") {
        console.warn("data_entries tablosu bulunamadı. Migration çalıştırılmalı.");
        return NextResponse.json({
          success: true,
          dataset: {
            id: dataset.id,
            name: dataset.name,
            schema: dataset.schema,
            row_count: 0,
          },
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false,
          },
        });
      }
      console.error("Data entries getirme hatası:", entriesError);
      return NextResponse.json({ error: "Veriler alınamadı" }, { status: 500 });
    }

    // Data'yı düz array formatına çevir
    const data = entries?.map((entry) => entry.data) || [];

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        schema: dataset.schema,
        row_count: dataset.row_count,
      },
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error("Dataset data API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Dataset verilerini güncelle veya yeniden yükle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;
    const body = await request.json();

    const { data: newData } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single() as { data: Profile | null };

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Dataset kontrolü
    const { data: dataset } = await adminClient
      .from("datasets")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single() as { data: Dataset | null };

    if (!dataset) {
      return NextResponse.json({ error: "Dataset bulunamadı" }, { status: 404 });
    }

    if (!newData || !Array.isArray(newData)) {
      return NextResponse.json({ error: "Geçerli veri gerekli" }, { status: 400 });
    }

    // Mevcut verileri sil
    await adminClient
      .from("data_entries")
      .delete()
      .eq("dataset_id", id);

    // Yeni verileri ekle
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(newData.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, newData.length);
      const batchData = newData.slice(start, end);

      const entries = batchData.map((row: Record<string, unknown>, idx: number) => ({
        dataset_id: id,
        row_index: start + idx,
        data: row,
      }));

      await adminClient.from("data_entries").insert(entries);
    }

    // Dataset row_count güncelle
    await adminClient
      .from("datasets")
      .update({ row_count: newData.length, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "dataset_data_updated",
      entity_type: "dataset",
      entity_id: id,
      entity_name: dataset.name,
      metadata: { new_row_count: newData.length },
    });

    return NextResponse.json({
      success: true,
      message: `${newData.length} satır güncellendi`,
    });
  } catch (error) {
    console.error("Dataset data güncelleme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
