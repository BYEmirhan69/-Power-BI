/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database.types";

// Bildirimleri getir
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const onlyUnread = searchParams.get("unread") === "true";
    const since = searchParams.get("since"); // ISO timestamp for incremental updates

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.eq("is_read", false);
    }

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error("Bildirimler getirme hatası:", error);
      return NextResponse.json(
        { error: "Bildirimler alınamadı" },
        { status: 500 }
      );
    }

    // Okunmamış sayısını al
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({ 
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Bildirimler getirme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Yeni bildirim oluştur (sistem tarafından kullanılır)
export async function POST(request: NextRequest) {
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
    const { title, message, type = "info", link } = body as {
      title: string;
      message?: string;
      type?: NotificationType;
      link?: string;
    };

    if (!title) {
      return NextResponse.json(
        { error: "Başlık gerekli" },
        { status: 400 }
      );
    }

    // Kullanıcının organization_id'sini al
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const { data: notification, error } = await (supabase as any)
      .from("notifications")
      .insert({
        user_id: user.id,
        organization_id: profile?.organization_id || null,
        type,
        title,
        message: message || null,
        link: link || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Bildirim oluşturma hatası:", error);
      return NextResponse.json(
        { error: "Bildirim oluşturulamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error("Bildirim oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Bildirimleri okundu olarak işaretle veya toplu güncelle
export async function PATCH(request: NextRequest) {
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
    const { notificationIds, markAllRead } = body as {
      notificationIds?: string[];
      markAllRead?: boolean;
    };

    if (markAllRead) {
      // Tüm bildirimleri okundu işaretle
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Bildirimleri güncelleme hatası:", error);
        return NextResponse.json(
          { error: "Bildirimler güncellenemedi" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Tüm bildirimler okundu" });
    }

    if (notificationIds && notificationIds.length > 0) {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("id", notificationIds);

      if (error) {
        console.error("Bildirimleri güncelleme hatası:", error);
        return NextResponse.json(
          { error: "Bildirimler güncellenemedi" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "notificationIds veya markAllRead gerekli" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bildirimleri güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// Bildirimleri sil
export async function DELETE(request: NextRequest) {
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
    const { notificationIds, deleteAll } = body as {
      notificationIds?: string[];
      deleteAll?: boolean;
    };

    if (deleteAll) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Bildirimleri silme hatası:", error);
        return NextResponse.json(
          { error: "Bildirimler silinemedi" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Tüm bildirimler silindi" });
    }

    if (notificationIds && notificationIds.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .in("id", notificationIds);

      if (error) {
        console.error("Bildirimleri silme hatası:", error);
        return NextResponse.json(
          { error: "Bildirimler silinemedi" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "notificationIds veya deleteAll gerekli" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Bildirimleri silme hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
