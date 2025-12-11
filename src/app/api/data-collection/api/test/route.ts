/**
 * API Route: Test Connection
 * Harici API bağlantısını test eder
 */

import { type NextRequest, NextResponse } from "next/server";
import { httpClient } from "@/lib/data-collection";
import { ApiRequestConfigSchema } from "@/types/data-collection.types";
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
    const parseResult = ApiRequestConfigSchema.safeParse(body);
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

    // Bağlantıyı test et
    const result = await httpClient.testConnection(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API test hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
