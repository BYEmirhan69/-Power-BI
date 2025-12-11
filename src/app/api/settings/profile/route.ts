 
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Kullanıcı profili getir
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

    // Profil bilgilerini getir (admin client ile RLS bypass)
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("*, organizations(*)")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profil getirme hatası:", profileError);
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
    const adminClient = createAdminClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, avatar_url } = body;

    // Profil güncelle (admin client ile RLS bypass)
    const { data: profile, error: updateError } = await adminClient
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
    await adminClient.from("activity_logs").insert({
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
