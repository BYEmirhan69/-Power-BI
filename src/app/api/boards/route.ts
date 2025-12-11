/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Dashboard, DashboardChart } from "@/types/database.types";

interface BoardWithRelations extends Dashboard {
  profiles?: Profile | null;
  dashboard_charts?: DashboardChart[] | null;
}

// Board'ları listele
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

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
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isPublic = searchParams.get("is_public");
    const isDefault = searchParams.get("is_default");
    const sortBy = searchParams.get("sort_by") || "updated_at";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Board'ları al
    let query = adminClient
      .from("dashboards")
      .select(`
        *,
        profiles:created_by (
          id,
          full_name,
          email,
          avatar_url
        ),
        dashboard_charts (
          id,
          chart_id
        )
      `, { count: "exact" })
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null);

    // Filtreler
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (isPublic === "true") {
      query = query.eq("is_public", true);
    } else if (isPublic === "false") {
      query = query.eq("is_public", false);
    }

    if (isDefault === "true") {
      query = query.eq("is_default", true);
    }

    // Sıralama
    const ascending = sortOrder === "asc";
    query = query.order(sortBy as any, { ascending });

    // Sayfalama
    query = query.range(offset, offset + limit - 1);

    const { data: boardsData, error, count } = await query;

    const boards = boardsData as BoardWithRelations[] | null;

    if (error) {
      console.error("Board'lar alınırken hata:", error);
      return NextResponse.json({ error: "Board'lar alınamadı" }, { status: 500 });
    }

    // İstatistikler
    const { data: allBoardsData } = await adminClient
      .from("dashboards")
      .select("id, is_public, is_default")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null);

    const allBoards = allBoardsData as Pick<Dashboard, "id" | "is_public" | "is_default">[] | null;

    const stats = {
      total: allBoards?.length || 0,
      public: allBoards?.filter(b => b.is_public).length || 0,
      private: allBoards?.filter(b => !b.is_public).length || 0,
      default: allBoards?.filter(b => b.is_default).length || 0,
    };

    return NextResponse.json({
      boards: boards || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Board API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Yeni board oluştur
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

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
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      layout,
      theme,
      filters,
      is_default,
      is_public,
      refresh_interval,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Board adı gerekli" }, { status: 400 });
    }

    // Varsayılan layout
    const defaultLayout = layout || {
      type: "grid",
      columns: 12,
      rows: [],
    };

    // Yeni board oluştur
    const { data: newBoardData, error } = await adminClient
      .from("dashboards")
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        layout: defaultLayout,
        theme: theme || null,
        filters: filters || null,
        is_default: is_default || false,
        is_public: is_public || false,
        refresh_interval: refresh_interval || null,
      } as any)
      .select()
      .single();

    const newBoard = newBoardData as Dashboard | null;

    if (error || !newBoard) {
      console.error("Board oluşturma hatası:", error);
      return NextResponse.json({ error: "Board oluşturulamadı" }, { status: 500 });
    }

    // Aktivite logu
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "board_created",
      entity_type: "dashboard",
      entity_id: newBoard.id,
      entity_name: newBoard.name,
      metadata: { is_public: is_public, is_default: is_default },
    } as any);

    return NextResponse.json({
      board: newBoard,
      message: "Board başarıyla oluşturuldu",
    });
  } catch (error) {
    console.error("Board oluşturma API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
