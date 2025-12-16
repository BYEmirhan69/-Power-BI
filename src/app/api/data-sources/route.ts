/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DataSourceType, Profile, DataSource } from "@/types/database.types";

// Veri kaynaklarını listele
export async function GET() {
  try {
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

    // Mevcut kullanıcıyı al
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 400 }
      );
    }

    // Veri kaynaklarını al
    const { data: dataSourcesData, error: dataSourcesError } = await adminClient
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
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const dataSources = dataSourcesData as (DataSource & { profiles: Profile | null })[] | null;

    if (dataSourcesError) {
      console.error("Veri kaynakları alınırken hata:", dataSourcesError);
      return NextResponse.json(
        { error: "Veri kaynakları alınamadı" },
        { status: 500 }
      );
    }

    // İstatistikleri hesapla
    const stats = {
      total: dataSources?.length || 0,
      active: dataSources?.filter((ds) => ds.is_active).length || 0,
      byType: dataSources?.reduce((acc, ds) => {
        acc[ds.type] = (acc[ds.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
      byStatus: dataSources?.reduce((acc, ds) => {
        const status = ds.last_sync_status || "never";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {},
    };

    return NextResponse.json({ dataSources, stats });
  } catch (error) {
    console.error("Veri kaynakları API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Yeni veri kaynağı oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

    // Mevcut kullanıcıyı al
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, type, config, credentials, sync_schedule } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "İsim ve tür gerekli" },
        { status: 400 }
      );
    }

    // Veri kaynağı oluştur
    const { data: dataSourceData, error: createError } = await adminClient
      .from("data_sources")
      .insert({
        organization_id: profile.organization_id,
        name,
        type: type as DataSourceType,
        config: config || null,
        credentials: credentials || null,
        sync_schedule: sync_schedule || null,
        is_active: true,
        created_by: user.id,
      } as any)
      .select()
      .single();

    const dataSource = dataSourceData as DataSource | null;

    if (createError || !dataSource) {
      console.error("Veri kaynağı oluşturma hatası:", createError);
      return NextResponse.json(
        { error: "Veri kaynağı oluşturulamadı" },
        { status: 500 }
      );
    }

    // Aktivite logu oluştur
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "create",
      entity_type: "data_source",
      entity_id: dataSource.id,
      entity_name: name,
      metadata: { type },
    } as any);

    return NextResponse.json({
      success: true,
      dataSource,
      message: "Veri kaynağı başarıyla oluşturuldu",
    });
  } catch (error) {
    console.error("Veri kaynağı oluşturma API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
