/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Tek grafik detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { data: chart, error } = await supabase
      .from("charts")
      .select(`
        *,
        datasets:dataset_id (id, name, schema, row_count),
        users:created_by (id, email, full_name)
      `)
      .eq("id", id)
      .single();

    if (error || !chart) {
      return NextResponse.json(
        { error: "Grafik bulunamadı" },
        { status: 404 }
      );
    }

    // View count artır
    await supabase
      .from("charts")
      .update({ view_count: (chart.view_count || 0) + 1 })
      .eq("id", id);

    return NextResponse.json({ chart });
  } catch (error) {
    console.error("Chart GET error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// PUT - Grafik güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, type, dataset_id, config, filters, is_public } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (dataset_id !== undefined) updateData.dataset_id = dataset_id;
    if (config !== undefined) updateData.config = config;
    if (filters !== undefined) updateData.filters = filters;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: chart, error } = await supabase
      .from("charts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Chart update error:", error);
      return NextResponse.json(
        { error: "Grafik güncellenirken hata oluştu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ chart });
  } catch (error) {
    console.error("Chart PUT error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// DELETE - Grafik sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("charts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Chart delete error:", error);
      return NextResponse.json(
        { error: "Grafik silinirken hata oluştu" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Grafik başarıyla silindi" });
  } catch (error) {
    console.error("Chart DELETE error:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
