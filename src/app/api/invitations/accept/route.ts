/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Daveti kabul et
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Davet tokeni gerekli" },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Daveti bul
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Geçersiz veya bulunamayan davet" },
        { status: 404 }
      );
    }

    // Davet durumunu kontrol et
    if (invitation.status !== "pending") {
      const statusMessages: Record<string, string> = {
        accepted: "Bu davet zaten kabul edilmiş",
        expired: "Bu davetin süresi dolmuş",
        revoked: "Bu davet iptal edilmiş",
      };
      return NextResponse.json(
        { error: statusMessages[invitation.status] || "Geçersiz davet durumu" },
        { status: 400 }
      );
    }

    // Süre kontrolü
    if (new Date(invitation.expires_at) < new Date()) {
      // Daveti expired olarak işaretle
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "Bu davetin süresi dolmuş" },
        { status: 400 }
      );
    }

    // E-posta kontrolü
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Bu davet farklı bir e-posta adresi için gönderilmiş" },
        { status: 403 }
      );
    }

    // Kullanıcının profilini güncelle
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        organization_id: invitation.organization_id,
        role: invitation.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profil güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Organizasyona katılınamadı" },
        { status: 500 }
      );
    }

    // Daveti kabul edildi olarak işaretle
    await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: invitation.organization_id,
      action: "accept_invitation",
      entity_type: "invitation",
      entity_id: invitation.id,
      entity_name: user.email,
      metadata: {
        role: invitation.role,
      },
    });

    // Organizasyon bilgisini al
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();

    return NextResponse.json({
      success: true,
      message: `${organization?.name || "Organizasyon"} organizasyonuna başarıyla katıldınız`,
      organization: organization,
      role: invitation.role,
    });
  } catch (error) {
    console.error("Davet kabul API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Token ile davet bilgisini al (kabul etmeden önce göstermek için)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Davet tokeni gerekli" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Daveti bul
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        organization:organizations(name)
      `)
      .eq("token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Geçersiz veya bulunamayan davet" },
        { status: 404 }
      );
    }

    // Süre kontrolü
    const isExpired = new Date(invitation.expires_at) < new Date();
    
    return NextResponse.json({
      invitation: {
        ...invitation,
        isExpired,
        organizationName: (invitation.organization as { name: string } | null)?.name,
      },
    });
  } catch (error) {
    console.error("Davet bilgisi API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
