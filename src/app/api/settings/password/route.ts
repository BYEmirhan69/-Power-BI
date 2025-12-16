/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Şifre değiştir
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }

    // Şifre güncelle
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Şifre güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Şifre güncellenemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    await (supabase as any).from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      action: "UPDATE",
      entity_type: "security",
      entity_id: user.id,
      entity_name: "Şifre değiştirildi",
      metadata: { action: "password_change" },
    });

    return NextResponse.json({ success: true, message: "Şifre başarıyla güncellendi" });
  } catch (error) {
    console.error("Şifre güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
