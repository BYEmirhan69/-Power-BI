/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database.types";

// Aktivite loglarını listele
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

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
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 400 });
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const actionFilter = searchParams.get("action") || "all";
    const entityFilter = searchParams.get("entity") || "all";
    const dateFilter = searchParams.get("date") || "all";
    const search = searchParams.get("search") || "";

    // Base query
    let query = adminClient
      .from("activity_logs")
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url,
          role
        )
      `, { count: "exact" })
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });

    // Filtreler
    if (actionFilter !== "all") {
      query = query.ilike("action", `%${actionFilter}%`);
    }

    if (entityFilter !== "all") {
      query = query.eq("entity_type", entityFilter);
    }

    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        default:
          startDate = new Date(0);
      }

      query = query.gte("created_at", startDate.toISOString());
    }

    // Arama
    if (search) {
      query = query.or(`entity_name.ilike.%${search}%,action.ilike.%${search}%`);
    }

    // Pagination
    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Aktiviteler alınırken hata:", error);
      return NextResponse.json({ error: "Aktiviteler alınamadı" }, { status: 500 });
    }

    return NextResponse.json({
      activities: data || [],
      totalCount: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Aktiviteler API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// İstatistikleri getir
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 400 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Toplam
    const { count: total } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id);

    // Bugün
    const { count: today } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .gte("created_at", startOfToday);

    // Bu hafta
    const { count: thisWeek } = await adminClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .gte("created_at", startOfWeek);

    // Tüm aktiviteleri al (istatistik için)
    const { data: allActivities } = await adminClient
      .from("activity_logs")
      .select("action, entity_type")
      .eq("organization_id", profile.organization_id);

    // Aksiyona göre grupla
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    if (allActivities) {
      allActivities.forEach((activity: { action: string; entity_type: string }) => {
        const baseAction = activity.action.split("_")[0];
        byAction[baseAction] = (byAction[baseAction] || 0) + 1;
        byEntity[activity.entity_type] = (byEntity[activity.entity_type] || 0) + 1;
      });
    }

    return NextResponse.json({
      stats: {
        total: total || 0,
        today: today || 0,
        thisWeek: thisWeek || 0,
        byAction,
        byEntity,
      },
    });
  } catch (error) {
    console.error("İstatistikler API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
