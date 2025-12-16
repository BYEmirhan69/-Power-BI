/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Davet detayını al
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Daveti al
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        *,
        invited_by_profile:profiles!invitations_invited_by_fkey(full_name, email)
      `)
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id!)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Davet bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("Davet detay API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Daveti iptal et
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Daveti kontrol et
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (!invitation) {
      return NextResponse.json(
        { error: "Davet bulunamadı" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: "Sadece bekleyen davetler iptal edilebilir" },
        { status: 400 }
      );
    }

    // Daveti iptal et
    const { error: revokeError } = await supabase
      .from("invitations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (revokeError) {
      console.error("Davet iptal hatası:", revokeError);
      return NextResponse.json(
        { error: "Davet iptal edilemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: currentProfile.organization_id,
      action: "revoke_invitation",
      entity_type: "invitation",
      entity_id: id,
      entity_name: invitation.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Davet iptal API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Daveti yeniden gönder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Daveti kontrol et
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*")
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (!invitation) {
      return NextResponse.json(
        { error: "Davet bulunamadı" },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      return NextResponse.json(
        { error: "Sadece bekleyen veya süresi dolmuş davetler yeniden gönderilebilir" },
        { status: 400 }
      );
    }

    // Yeni token ve süre oluştur
    const newToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Daveti güncelle
    const { data: updatedInvitation, error: updateError } = await supabase
      .from("invitations")
      .update({
        token: newToken,
        status: "pending",
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Davet güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Davet yenilenemedi" },
        { status: 500 }
      );
    }

    // Davet linkini oluştur
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/auth/accept-invite?token=${updatedInvitation.token}`;

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: currentProfile.organization_id,
      action: "resend_invitation",
      entity_type: "invitation",
      entity_id: id,
      entity_name: invitation.email,
    });

    return NextResponse.json({
      invitation: updatedInvitation,
      inviteLink,
      message: "Davet yenilendi",
    });
  } catch (error) {
    console.error("Davet yenileme API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
