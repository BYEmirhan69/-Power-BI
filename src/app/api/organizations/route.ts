import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Organization = Database["public"]["Tables"]["organizations"]["Row"];

// Profil yoksa oluştur
async function ensureProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
): Promise<Pick<Profile, "id" | "organization_id"> | null> {
  // Önce mevcut profili kontrol et
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, organization_id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    return existingProfile as Pick<Profile, "id" | "organization_id">;
  }

  // Profil yoksa oluştur
  const { data: newProfile, error } = await adminClient
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || null,
      role: "user",
      email_verified: false,
    } as never)
    .select("id, organization_id")
    .single();

  if (error) {
    console.error("Profil oluşturma hatası:", error);
    return null;
  }

  return newProfile as Pick<Profile, "id" | "organization_id">;
}

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

    // Kullanıcının profilini kontrol et veya oluştur
    const profile = await ensureProfile(adminClient, user);

    if (!profile) {
      return NextResponse.json({ error: "Profil oluşturulamadı" }, { status: 500 });
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
    const { data: orgData, error: orgError } = await adminClient
      .from("organizations")
      .insert({
        name: name.trim(),
      } as never)
      .select()
      .single();
    
    const organization = orgData as Organization | null;

    if (orgError || !organization) {
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
      } as never)
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
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();
    
    const profile = profileData as Pick<Profile, "organization_id"> | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ organization: null });
    }

    // Organizasyonu getir
    const { data: orgData } = await adminClient
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();
    
    const organization = orgData as Organization | null;

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Organization get error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
