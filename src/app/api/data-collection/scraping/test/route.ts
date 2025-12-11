/**
 * API Route: Test URL for Scraping
 * URL'in scraping için uygunluğunu test eder
 */

import { type NextRequest, NextResponse } from "next/server";
import { scrapingService } from "@/lib/data-collection";
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
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL gerekli" },
        { status: 400 }
      );
    }

    // URL'i test et
    const result = await scrapingService.testUrl(url);

    return NextResponse.json(result);
  } catch (error) {
    console.error("URL test hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
