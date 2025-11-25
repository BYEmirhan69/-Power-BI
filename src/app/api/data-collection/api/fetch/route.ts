/**
 * API Route: Fetch Data from External API
 * Harici API'den veri çeker
 */

import { NextRequest, NextResponse } from "next/server";
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
    const parseResult = ApiRequestConfigSchema.safeParse(body.config);
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

    // Pagination ayarları
    const paginationOptions = body.pagination;

    let result;
    if (paginationOptions?.enabled) {
      // Pagination ile çek
      result = await httpClient.fetchPaginated(
        parseResult.data,
        {
          pageParam: paginationOptions.pageParam || "page",
          limitParam: paginationOptions.limitParam || "limit",
          pageSize: paginationOptions.pageSize || 100,
          maxPages: paginationOptions.maxPages || 10,
          getData: paginationOptions.dataPath 
            ? (r: unknown) => getNestedValue(r, paginationOptions.dataPath)
            : undefined,
        }
      );
    } else {
      // Tek istek
      result = await httpClient.request(parseResult.data);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API fetch hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Nested obje değerini alır (örn: "data.items" -> obj.data.items)
 */
function getNestedValue(obj: unknown, path: string): unknown[] {
  const parts = path.split(".");
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return [];
    }
  }
  
  return Array.isArray(current) ? current : [current];
}
