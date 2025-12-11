 
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Dashboard } from "@/types/database.types";

// Dashboard'ları listele
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
    const { data: profileData } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const profile = profileData as Profile | null;

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });
    }

    // Dashboard'ları al
    const { data: dashboardsData, error } = await adminClient
      .from("dashboards")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const dashboards = dashboardsData as Dashboard[] | null;

    if (error) {
      console.error("Dashboard'lar alınırken hata:", error);
      return NextResponse.json({ error: "Dashboard'lar alınamadı" }, { status: 500 });
    }

    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error("Dashboard API hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
