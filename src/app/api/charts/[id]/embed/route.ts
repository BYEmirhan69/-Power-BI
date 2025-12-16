/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST - Yeni embed token oluştur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Yeni embed token oluştur
    const newToken = crypto.randomUUID();

    const { data: chart, error } = await supabase
      .from("charts")
      .update({ 
        embed_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Embed token update error:", error);
      return NextResponse.json(
        { error: "Embed token güncellenirken hata oluştu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      chart,
      embed_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/embed/chart/${newToken}`
    });
  } catch (error) {
    console.error("Embed API error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// GET - Embed kodu al
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { data: chart, error } = await supabase
      .from("charts")
      .select("id, name, embed_token, is_public")
      .eq("id", id)
      .single() as { data: { id: string; name: string; embed_token: string; is_public: boolean } | null; error: any };

    if (error || !chart) {
      return NextResponse.json(
        { error: "Grafik bulunamadı" },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const embedUrl = `${baseUrl}/embed/chart/${chart.embed_token}`;
    
    const iframeCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="400" 
  frameborder="0" 
  allowfullscreen
  title="${chart.name}"
></iframe>`;

    return NextResponse.json({ 
      chart,
      embed_url: embedUrl,
      iframe_code: iframeCode
    });
  } catch (error) {
    console.error("Embed GET error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
