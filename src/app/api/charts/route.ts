/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Chart } from "@/types/database.types";

// GET - Tüm grafikleri listele
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Kullanıcının profilini al (admin client ile RLS bypass)
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 404 }
      );
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const isPublic = searchParams.get("is_public");

    let query = adminClient
      .from("charts")
      .select(`
        *,
        datasets:dataset_id (id, name),
        profiles:created_by (id, email, full_name)
      `)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    if (isPublic === "true") {
      query = query.eq("is_public", true);
    } else if (isPublic === "false") {
      query = query.eq("is_public", false);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: charts, error } = await query;

    if (error) {
      console.error("Charts fetch error:", error);
      return NextResponse.json(
        { error: "Grafikler alınırken hata oluştu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ charts });
  } catch (error) {
    console.error("Charts API error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// POST - Yeni grafik oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Kullanıcının profilini al
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, type, dataset_id, config, filters, is_public } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "İsim ve tür zorunludur" },
        { status: 400 }
      );
    }

    // Embed token oluştur
    const embedToken = crypto.randomUUID();

    // Insert objesi hazırla
    const insertData: Record<string, unknown> = {
      organization_id: profile.organization_id,
      created_by: user.id,
      name,
      description: description || null,
      type,
      config: config || {},
      filters: filters || {},
      is_public: is_public || false,
      embed_token: embedToken,
      view_count: 0,
    };

    // dataset_id sadece varsa ekle (veritabanında NOT NULL constraint varsa sorun olmasın)
    if (dataset_id) {
      insertData.dataset_id = dataset_id;
    }

    const { data: chartData, error } = await adminClient
      .from("charts")
      .insert(insertData as any)
      .select()
      .single();

    const chart = chartData as Chart | null;

    if (error || !chart) {
      console.error("Chart create error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: error?.message || "Grafik oluşturulurken hata oluştu", details: error },
        { status: 500 }
      );
    }

    // Activity log ekle
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "CREATE",
      entity_type: "chart",
      entity_id: chart.id,
      entity_name: name,
      metadata: { type },
    } as any);

    return NextResponse.json({ chart }, { status: 201 });
  } catch (error) {
    console.error("Charts API error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
