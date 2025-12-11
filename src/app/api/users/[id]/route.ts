 
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kullanıcı detayını al
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Mevcut kullanıcının profilini al
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

    // Hedef kullanıcıyı al
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error("Kullanıcı detay API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Kullanıcı rolünü güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { role } = body;

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

    // Mevcut kullanıcının profilini al
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

    // Kendi rolünü değiştirmeye çalışıyor mu kontrol et
    if (id === user.id) {
      return NextResponse.json(
        { error: "Kendi rolünüzü değiştiremezsiniz" },
        { status: 400 }
      );
    }

    // Hedef kullanıcının aynı organizasyonda olduğunu kontrol et
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya farklı organizasyonda" },
        { status: 404 }
      );
    }

    // Rolü güncelle
    const { data: updatedUser, error: updateError } = await supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Rol güncelleme hatası:", updateError);
      return NextResponse.json(
        { error: "Rol güncellenemedi" },
        { status: 500 }
      );
    }

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: currentProfile.organization_id,
      action: "update_user_role",
      entity_type: "profile",
      entity_id: id,
      entity_name: targetUser.full_name || targetUser.email,
      metadata: {
        old_role: targetUser.role,
        new_role: role,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Kullanıcı güncelleme API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Kullanıcıyı organizasyondan çıkar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Mevcut kullanıcının profilini al
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

    // Kendini silmeye çalışıyor mu kontrol et
    if (id === user.id) {
      return NextResponse.json(
        { error: "Kendinizi organizasyondan çıkaramazsınız" },
        { status: 400 }
      );
    }

    // Hedef kullanıcının aynı organizasyonda olduğunu kontrol et
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("organization_id", currentProfile.organization_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı veya farklı organizasyonda" },
        { status: 404 }
      );
    }

    // Organizasyondan çıkar (organization_id'yi null yap)
    const { error: removeError } = await supabase
      .from("profiles")
      .update({ 
        organization_id: null, 
        role: "user",
        updated_at: new Date().toISOString() 
      })
      .eq("id", id);

    if (removeError) {
      console.error("Kullanıcı çıkarma hatası:", removeError);
      return NextResponse.json(
        { error: "Kullanıcı organizasyondan çıkarılamadı" },
        { status: 500 }
      );
    }

    // Activity log ekle
    await supabase.from("activity_logs").insert({
      user_id: user.id,
      organization_id: currentProfile.organization_id,
      action: "remove_user",
      entity_type: "profile",
      entity_id: id,
      entity_name: targetUser.full_name || targetUser.email,
      metadata: {
        removed_user_email: targetUser.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kullanıcı silme API hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
