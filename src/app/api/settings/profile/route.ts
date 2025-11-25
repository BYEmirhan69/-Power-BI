import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kullanıcı profili getir
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Profil bilgilerini getir
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Profil bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profil getirme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Profil güncelle
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, avatar_url } = body;

    // Profil güncelle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: updateError } = await (supabase as any)
      .from("profiles")
      .update({
        full_name,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Profil güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Profil güncellenemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      action: "UPDATE",
      entity_type: "profile",
      entity_id: user.id,
      entity_name: full_name,
      metadata: { updated_fields: ["full_name", "avatar_url"] },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
