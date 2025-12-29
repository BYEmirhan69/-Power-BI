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
  file_url: string | null;
}

interface Profile {
  id: string;
  organization_id: string;
  [key: string]: any;
}

// data_entries tablosunun var olup olmadığını kontrol et
async function checkDataEntriesTableExists(adminClient: any): Promise<boolean> {
  try {
    const { error } = await adminClient
      .from("data_entries")
      .select("id")
      .limit(1);
    
    if (error?.code === "PGRST205" || error?.code === "42P01") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
      .select("id, name, schema, row_count, organization_id, file_url")
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

    // data_entries tablosu var mı kontrol et
    const hasDataEntriesTable = await checkDataEntriesTableExists(adminClient);

    let data: Record<string, any>[] = [];
    let total = 0;

    if (hasDataEntriesTable) {
      // Data entries'leri al
      const { data: entries, error: entriesError, count } = await adminClient
        .from("data_entries")
        .select("row_index, data", { count: "exact" })
        .eq("dataset_id", id)
        .order(orderBy, { ascending: orderDir })
        .range(offset, offset + limit - 1) as { data: DataEntry[] | null; error: any; count: number | null };

      if (entriesError && entriesError.code !== "PGRST205") {
        console.error("Data entries getirme hatası:", entriesError);
      }

      if (entries && entries.length > 0) {
        data = entries.map((entry) => entry.data);
        total = count || 0;
      }
    }

    // data_entries'den veri gelmezse, file_url'den oku (fallback)
    if (data.length === 0 && dataset.file_url) {
      try {
        const rawData = JSON.parse(dataset.file_url);
        if (Array.isArray(rawData)) {
          total = rawData.length;
          data = rawData.slice(offset, offset + limit);
        }
      } catch (parseError) {
        console.warn("file_url parse hatası:", parseError);
      }
    }

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        schema: dataset.schema,
        row_count: dataset.row_count || total,
      },
      data,
      pagination: {
        total: total || dataset.row_count || 0,
        limit,
        offset,
        hasMore: total > offset + limit,
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
