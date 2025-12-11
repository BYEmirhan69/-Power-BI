 
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dataset'leri listele
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

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
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Dataset'leri al (soft delete edilmemişler)
    const { data: datasets, error } = await adminClient
      .from("datasets")
      .select(`
        *,
        data_source:data_sources(id, name, type),
        creator:profiles!datasets_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Dataset'ler alınırken hata:", error);
      return NextResponse.json({ error: "Dataset'ler alınamadı" }, { status: 500 });
    }

    return NextResponse.json({ datasets });
  } catch (error) {
    console.error("Datasets API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Yeni dataset oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      type = "manual",
      schema = [],
      row_count = 0,
      category,
      data_source_id,
      file_url,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Dataset adı gerekli" },
        { status: 400 }
      );
    }

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
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Dataset'i oluştur
    const { data: dataset, error } = await adminClient
      .from("datasets")
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name,
        description,
        type,
        schema,
        row_count,
        category: category || "other",
        data_source_id: data_source_id || null,
        file_url: file_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Dataset oluşturulurken hata:", error);
      return NextResponse.json({ error: "Dataset oluşturulamadı" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "dataset_created",
      entity_type: "dataset",
      entity_id: dataset.id,
      entity_name: name,
      metadata: { type, category, row_count },
    });

    return NextResponse.json({ dataset }, { status: 201 });
  } catch (error) {
    console.error("Dataset oluşturma API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
