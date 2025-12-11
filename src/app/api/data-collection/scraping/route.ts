/**
 * API Route: Web Scraping
 * Web sayfalarından veri çeker
 */

import { type NextRequest, NextResponse } from "next/server";
import { scrapingService } from "@/lib/data-collection";
import { ScrapingConfigSchema } from "@/types/data-collection.types";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Yetkilendirme gerekli" },
        { status: 401 }
      );
    }

    // Request body'yi parse et
    const body = await request.json();
    
    // Validasyon
    const parseResult = ScrapingConfigSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Geçersiz yapılandırma",
          details: parseResult.error.issues 
        },
        { status: 400 }
      );
    }

    // Scraping işlemini başlat
    const result = await scrapingService.scrape(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scraping hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
