/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dataset detayını al
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Dataset'i al
    const { data: dataset, error } = await adminClient
      .from("datasets")
      .select(`
        *,
        data_source:data_sources(id, name, type),
        creator:profiles!datasets_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (error || !dataset) {
      return NextResponse.json({ error: "Dataset bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ dataset });
  } catch (error) {
    console.error("Dataset detay API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Dataset'i güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      category,
      schema,
    } = body;

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

    // Mevcut dataset'i kontrol et
    const { data: existingDataset } = await adminClient
      .from("datasets")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (!existingDataset) {
      return NextResponse.json({ error: "Dataset bulunamadı" }, { status: 404 });
    }

    // Güncelleme verisi
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (schema !== undefined) updateData.schema = schema;

    const { data: dataset, error } = await adminClient
      .from("datasets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Dataset güncellenirken hata:", error);
      return NextResponse.json({ error: "Dataset güncellenemedi" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "dataset_updated",
      entity_type: "dataset",
      entity_id: id,
      entity_name: dataset.name,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return NextResponse.json({ dataset });
  } catch (error) {
    console.error("Dataset güncelleme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Dataset'i sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Mevcut dataset'i kontrol et
    const { data: existingDataset } = await adminClient
      .from("datasets")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (!existingDataset) {
      return NextResponse.json({ error: "Dataset bulunamadı" }, { status: 404 });
    }

    // Bu dataset'e bağlı chart var mı kontrol et
    const { data: relatedCharts } = await adminClient
      .from("charts")
      .select("id")
      .eq("dataset_id", id)
      .is("deleted_at", null)
      .limit(1);

    if (relatedCharts && relatedCharts.length > 0) {
      return NextResponse.json(
        { error: "Bu dataset'e bağlı grafikler var. Önce grafikleri silin." },
        { status: 400 }
      );
    }

    // Soft delete
    const { error } = await adminClient
      .from("datasets")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Dataset silinirken hata:", error);
      return NextResponse.json({ error: "Dataset silinemedi" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "dataset_deleted",
      entity_type: "dataset",
      entity_id: id,
      entity_name: existingDataset.name,
    });

    return NextResponse.json({ message: "Dataset silindi" });
  } catch (error) {
    console.error("Dataset silme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
