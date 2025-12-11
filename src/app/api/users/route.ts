 
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Kullanıcıları listele
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Mevcut kullanıcıyı al
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Kullanıcının profilini al (admin client ile RLS bypass)
    const { data: currentProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !currentProfile) {
      console.error("Profil getirme hatası:", profileError);
      return NextResponse.json(
        { error: "Profil bulunamadı" },
        { status: 404 }
      );
    }

    if (currentProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Bu işlem için admin yetkisi gerekli" },
        { status: 403 }
      );
    }

    if (!currentProfile.organization_id) {
      return NextResponse.json(
        { error: "Organizasyon bulunamadı" },
        { status: 400 }
      );
    }

    // Organizasyondaki tüm kullanıcıları al (admin client ile)
    const { data: users, error: usersError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("organization_id", currentProfile.organization_id)
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error("Kullanıcılar alınırken hata:", usersError);
      return NextResponse.json(
        { error: "Kullanıcılar alınamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Kullanıcılar API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
