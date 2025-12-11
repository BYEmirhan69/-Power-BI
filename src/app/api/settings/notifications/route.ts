import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Bildirim ayarlarını getir
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

    // Default ayarlar
    const defaultSettings = {
      emailNotifications: true,
      reportAlerts: true,
      dataUpdateAlerts: true,
      securityAlerts: true,
      marketingEmails: false,
    };

    // Kullanıcının metadata'sından ayarları al veya default kullan
    const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
    const notificationSettings = userMetadata?.notification_settings || defaultSettings;

    return NextResponse.json({ settings: notificationSettings });
  } catch (error) {
    console.error("Bildirim ayarları getirme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Bildirim ayarlarını güncelle
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
    const { settings } = body;

    // Supabase auth metadata'sını güncelle
    const { error: updateError } = await supabase.auth.updateUser({
      data: { notification_settings: settings }
    });

    if (updateError) {
      console.error("Bildirim ayarları güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Ayarlar güncellenemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile?.organization_id ?? null,
      action: "UPDATE",
      entity_type: "settings",
      entity_id: user.id,
      entity_name: "Bildirim ayarları",
      metadata: { updated_settings: settings },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Bildirim ayarları güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
