/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Davetleri listele
export async function GET() {
  try {
    const supabase = await createClient() as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
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

    // Organizasyondaki davetleri al
    const { data: invitations, error: invitationsError } = await supabase
      .from("invitations")
      .select(`
        *,
        invited_by_profile:profiles!invited_by(full_name, email)
      `)
      .eq("organization_id", currentProfile.organization_id)
      .order("created_at", { ascending: false });

    if (invitationsError) {
      console.error("Davetler alınırken hata:", invitationsError);
      return NextResponse.json(
        { error: "Davetler alınamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Davetler API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Yeni davet oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const body = await request.json();
    const { email, role } = body;

    // Email validasyonu
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçerli bir e-posta adresi girin" },
        { status: 400 }
      );
    }

    // Rol validasyonu
    if (!role || !["admin", "user", "developer"].includes(role)) {
      return NextResponse.json(
        { error: "Geçersiz rol" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
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

    // Bu email zaten organizasyonda mı kontrol et
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu kullanıcı zaten organizasyonda" },
        { status: 400 }
      );
    }

    // Bekleyen davet var mı kontrol et
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("organization_id", currentProfile.organization_id)
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Bu e-posta adresine zaten bekleyen bir davet var" },
        { status: 400 }
      );
    }

    // Organizasyon bilgisini al
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", currentProfile.organization_id)
      .single();

    // Davet oluştur
    const { data: invitation, error: createError } = await supabase
      .from("invitations")
      .insert({
        organization_id: currentProfile.organization_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün
      })
      .select()
      .single();

    if (createError) {
      console.error("Davet oluşturma hatası:", createError);
      return NextResponse.json(
        { error: "Davet oluşturulamadı" },
        { status: 500 }
      );
    }

    // Davet linkini oluştur
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/auth/accept-invite?token=${invitation.token}`;

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: currentProfile.organization_id,
      action: "create_invitation",
      entity_type: "invitation",
      entity_id: invitation.id,
      entity_name: email,
      metadata: {
        role,
        expires_at: invitation.expires_at,
      },
    });

    // Supabase Auth ile davet emaili gönder (opsiyonel)
    // NOT: Supabase'in dahili SMTP'si sadece proje ekibine mail gönderebilir
    // Üretim ortamında özel SMTP yapılandırması gerekli
    try {
      // Supabase Auth inviteUserByEmail kullanarak davet gönder
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          redirectTo: inviteLink,
          data: {
            organization_id: currentProfile.organization_id,
            organization_name: organization?.name,
            role,
            invitation_id: invitation.id,
          },
        }
      );

      if (inviteError) {
        console.warn("Supabase davet e-postası gönderilemedi:", inviteError.message);
        // E-posta gönderilemese bile davet oluşturuldu, devam et
      }
    } catch (emailError) {
      console.warn("E-posta gönderimi başarısız:", emailError);
      // E-posta gönderilemese bile davet linki döndür
    }

    return NextResponse.json({
      invitation,
      inviteLink,
      message: "Davet oluşturuldu. Davet linki aşağıda gösterilmektedir.",
    });
  } catch (error) {
    console.error("Davet oluşturma API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
