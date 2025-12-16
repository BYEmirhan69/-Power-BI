/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DataSourceType, Profile, DataSource } from "@/types/database.types";

// Tek veri kaynağı getir
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
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    const { data: dataSourceData, error } = await adminClient
      .from("data_sources")
      .select(`
        *,
        profiles:created_by (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    const dataSource = dataSourceData as (DataSource & { profiles: Profile | null }) | null;

    if (error || !dataSource) {
      return NextResponse.json({ error: "Veri kaynağı bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ dataSource });
  } catch (error) {
    console.error("Veri kaynağı getirme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Veri kaynağı güncelle
export async function PATCH(
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
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, config, credentials, sync_schedule, is_active } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type as DataSourceType;
    if (config !== undefined) updateData.config = config;
    if (credentials !== undefined) updateData.credentials = credentials;
    if (sync_schedule !== undefined) updateData.sync_schedule = sync_schedule;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: dataSourceData, error } = await adminClient
      .from("data_sources")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .select()
      .single();

    const dataSource = dataSourceData as DataSource | null;

    if (error || !dataSource) {
      return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
    }

    // Aktivite logu
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "update",
      entity_type: "data_source",
      entity_id: id,
      entity_name: dataSource.name,
    } as any);

    return NextResponse.json({
      success: true,
      dataSource,
      message: "Veri kaynağı güncellendi",
    });
  } catch (error) {
    console.error("Veri kaynağı güncelleme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Veri kaynağı sil (soft delete)
export async function DELETE(
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
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    // Veri kaynağı adını al
    const { data: existingData } = await adminClient
      .from("data_sources")
      .select("name")
      .eq("id", id)
      .single();

    const existing = existingData as { name: string } | null;

    // Soft delete
    const { error } = await adminClient
      .from("data_sources")
      .update({ 
        deleted_at: new Date().toISOString(),
        is_active: false 
      })
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
    }

    // Aktivite logu
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "delete",
      entity_type: "data_source",
      entity_id: id,
      entity_name: existing?.name || "Bilinmeyen",
    } as any);

    return NextResponse.json({
      success: true,
      message: "Veri kaynağı silindi",
    });
  } catch (error) {
    console.error("Veri kaynağı silme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
