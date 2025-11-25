/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Organizasyon bilgilerini getir
export async function GET() {
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

    // Kullanıcının profilini getir (admin client ile RLS bypass)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profil getirme hatası:", profileError);
      return NextResponse.json(
        { error: "Profil bulunamadı" },
        { status: 404 }
      );
    }

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 404 }
      );
    }

    // Organizasyon bilgilerini getir
    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    if (orgError) {
      console.error("Organizasyon getirme hatası:", orgError);
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 404 }
      );
    }

    // Organizasyondaki kullanıcı sayısını getir
    const { count: memberCount } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id);

    return NextResponse.json({ 
      organization,
      memberCount: memberCount || 0,
      userRole: profile.role
    });
  } catch (error) {
    console.error("Organizasyon getirme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Organizasyon güncelle (sadece admin)
export async function PUT(request: NextRequest) {
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

    // Kullanıcının profilini getir
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profil bulunamadı" },
        { status: 404 }
      );
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "Bu işlem için admin yetkisi gereklidir" },
        { status: 403 }
      );
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Organizasyon adı gereklidir" },
        { status: 400 }
      );
    }

    // Organizasyonu güncelle
    const { data: organization, error: updateError } = await adminClient
      .from("organizations")
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.organization_id)
      .select()
      .single();

    if (updateError) {
      console.error("Organizasyon güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Organizasyon güncellenemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "UPDATE",
      entity_type: "organization",
      entity_id: profile.organization_id,
      entity_name: name,
      metadata: { updated_fields: ["name"] },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Organizasyon güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
