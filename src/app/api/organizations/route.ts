import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Organizasyon oluştur
export async function POST(request: Request) {
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

    // Kullanıcının profilini kontrol et
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
    }

    // Zaten organizasyonu varsa hata döndür
    if (profile.organization_id) {
      return NextResponse.json(
        { error: "Zaten bir organizasyona üyesiniz" },
        { status: 400 }
      );
    }

    // Request body'den organizasyon adını al
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Geçerli bir organizasyon adı giriniz" },
        { status: 400 }
      );
    }

    // Organizasyonu oluştur
    const { data: organization, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: name.trim(),
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organizasyon oluşturma hatası:", orgError);
      return NextResponse.json(
        { error: "Organizasyon oluşturulamadı" },
        { status: 500 }
      );
    }

    // Kullanıcıyı organizasyona ata ve admin yap
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        organization_id: organization.id,
        role: "admin", // Organizasyonu oluşturan kullanıcı admin olur
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profil güncelleme hatası:", updateError);
      // Organizasyonu sil (rollback)
      await adminClient.from("organizations").delete().eq("id", organization.id);
      return NextResponse.json(
        { error: "Organizasyon atanamadı" },
        { status: 500 }
      );
    }

    console.log(`Organization created: ${organization.id} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Organization create error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Kullanıcının organizasyonunu getir
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

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ organization: null });
    }

    // Organizasyonu getir
    const { data: organization } = await adminClient
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Organization get error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
