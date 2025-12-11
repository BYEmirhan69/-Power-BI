/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Dashboard, DashboardChart, Chart } from "@/types/database.types";

interface BoardWithDetails extends Dashboard {
  profiles?: Profile | null;
  dashboard_charts?: (DashboardChart & { charts?: Chart | null })[] | null;
}

// Tek bir board'u getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Board'u al
    const { data: boardData, error } = await adminClient
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
          chart_id,
          position,
          settings,
          charts:chart_id (
            id,
            name,
            type,
            config,
            thumbnail_url
          )
        )
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    const board = boardData as BoardWithDetails | null;

    if (error || !board) {
      return NextResponse.json({ error: "Board bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ board });
  } catch (error) {
    console.error("Board getirme hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Board güncelle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Mevcut board'u kontrol et
    const { data: existingBoardData } = await adminClient
      .from("dashboards")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    const existingBoard = existingBoardData as Dashboard | null;

    if (!existingBoard) {
      return NextResponse.json({ error: "Board bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Güncellenebilir alanlar
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.layout !== undefined) updateData.layout = body.layout;
    if (body.theme !== undefined) updateData.theme = body.theme;
    if (body.filters !== undefined) updateData.filters = body.filters;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.refresh_interval !== undefined) updateData.refresh_interval = body.refresh_interval;

    updateData.updated_at = new Date().toISOString();
    updateData.version = existingBoard.version + 1;

    // Güncelle
    const { data: updatedBoardData, error } = await (adminClient
      .from("dashboards") as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    const updatedBoard = updatedBoardData as Dashboard | null;

    if (error || !updatedBoard) {
      console.error("Board güncelleme hatası:", error);
      return NextResponse.json({ error: "Board güncellenemedi" }, { status: 500 });
    }

    // Aktivite logu
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "board_updated",
      entity_type: "dashboard",
      entity_id: id,
      entity_name: updatedBoard.name,
      metadata: { changes: Object.keys(updateData) },
    } as any);

    return NextResponse.json({
      board: updatedBoard,
      message: "Board başarıyla güncellendi",
    });
  } catch (error) {
    console.error("Board güncelleme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Board sil (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Mevcut board'u kontrol et
    const { data: existingBoardData } = await adminClient
      .from("dashboards")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    const existingBoard = existingBoardData as Dashboard | null;

    if (!existingBoard) {
      return NextResponse.json({ error: "Board bulunamadı" }, { status: 404 });
    }

    // Soft delete
    const { error } = await (adminClient
      .from("dashboards") as any)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Board silme hatası:", error);
      return NextResponse.json({ error: "Board silinemedi" }, { status: 500 });
    }

    // Aktivite logu
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "board_deleted",
      entity_type: "dashboard",
      entity_id: id,
      entity_name: existingBoard.name,
    } as any);

    return NextResponse.json({
      message: "Board başarıyla silindi",
    });
  } catch (error) {
    console.error("Board silme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
