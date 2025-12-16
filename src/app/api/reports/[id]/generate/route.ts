/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Rapor oluştur/üret
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient() as any;
    const adminClient = createAdminClient() as any;

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
    const { data: report, error: reportError } = await adminClient
      .from("reports")
      .select(`
        *,
        dashboard:dashboards(
          id, 
          name, 
          description,
          layout,
          dashboard_charts(
            id,
            position,
            chart:charts(
              id,
              name,
              type,
              config,
              dataset:datasets(id, name, schema, row_count)
            )
          )
        )
      `)
      .eq("id", id)
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: "Rapor bulunamadı" }, { status: 404 });
    }

    // Simüle edilmiş rapor üretimi
    // Gerçek uygulamada burada PDF/Excel/CSV üretimi yapılır
    const generatedAt = new Date().toISOString();
    const fileUrl = `/reports/generated/${id}_${Date.now()}.${report.format}`;

    // Raporu güncelle
    await adminClient
      .from("reports")
      .update({
        last_generated_at: generatedAt,
        file_url: fileUrl,
        updated_at: generatedAt,
      })
      .eq("id", id);

    // Activity log
    await adminClient.from("activity_logs").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: "report_generated",
      entity_type: "report",
      entity_id: id,
      entity_name: report.name,
      metadata: {
        format: report.format,
        dashboard_name: report.dashboard?.name,
      },
    });

    // Bildirim oluştur
    await adminClient.from("notifications").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      type: "success",
      title: "Rapor Oluşturuldu",
      message: `"${report.name}" raporu başarıyla oluşturuldu.`,
      link: `/dashboard/reports`,
    });

    return NextResponse.json({
      message: "Rapor başarıyla oluşturuldu",
      report: {
        ...report,
        last_generated_at: generatedAt,
        file_url: fileUrl,
      },
    });
  } catch (error) {
    console.error("Rapor üretme API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
