/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rapor detayını al
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
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Raporu al
    const { data: report, error } = await adminClient
      .from("reports")
      .select(`
        *,
        dashboard:dashboards(id, name, description),
        creator:profiles!reports_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Rapor detay API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Raporu güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      format,
      dashboard_id,
      schedule,
      recipients,
      is_active,
    } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Mevcut raporu kontrol et
    const { data: existingReport } = await adminClient
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (!existingReport) {
      return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
    }

    // Raporu güncelle
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (format !== undefined) updateData.format = format;
    if (dashboard_id !== undefined) updateData.dashboard_id = dashboard_id;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (recipients !== undefined) updateData.recipients = recipients;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: report, error } = await adminClient
      .from("reports")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Rapor güncellenirken hata:", error);
      return NextResponse.json({ error: "Rapor güncellenemedi" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "report_updated",
      entity_type: "report",
      entity_id: id,
      entity_name: report.name,
      metadata: { updated_fields: Object.keys(updateData) },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Rapor güncelleme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Raporu sil (soft delete)
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
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    // Kullanıcının profilini al
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Mevcut raporu kontrol et
    const { data: existingReport } = await adminClient
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (!existingReport) {
      return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
    }

    // Soft delete
    const { error } = await adminClient
      .from("reports")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", id);

    if (error) {
      console.error("Rapor silinirken hata:", error);
      return NextResponse.json({ error: "Rapor silinemedi" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "report_deleted",
      entity_type: "report",
      entity_id: id,
      entity_name: existingReport.name,
    });

    return NextResponse.json({ message: "Rapor silindi" });
  } catch (error) {
    console.error("Rapor silme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
