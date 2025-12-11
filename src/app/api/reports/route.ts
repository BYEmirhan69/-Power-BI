 
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Raporları listele
export async function GET() {
  try {
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

    // Raporları al (soft delete edilmemişler)
    const { data: reports, error } = await adminClient
      .from("reports")
      .select(`
        *,
        dashboard:dashboards(id, name),
        creator:profiles!reports_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Raporlar alınırken hata:", error);
      return NextResponse.json({ error: "Raporlar alınamadı" }, { status: 500 });
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Raporlar API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Yeni rapor oluştur
export async function POST(request: NextRequest) {
  try {
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
      is_active = true,
    } = body;

    if (!name || !format) {
      return NextResponse.json(
        { error: "Rapor adı ve format gerekli" },
        { status: 400 }
      );
    }

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

    // Raporu oluştur
    const { data: report, error } = await adminClient
      .from("reports")
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name,
        description,
        format,
        dashboard_id: dashboard_id || null,
        schedule: schedule || null,
        recipients: recipients || null,
        is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("Rapor oluşturulurken hata:", error);
      return NextResponse.json({ error: "Rapor oluşturulamadı" }, { status: 500 });
    }

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "report_created",
      entity_type: "report",
      entity_id: report.id,
      entity_name: name,
      metadata: { format, has_schedule: !!schedule },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Rapor oluşturma API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
