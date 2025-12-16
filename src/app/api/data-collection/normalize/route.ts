/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Route: CSV Normalize
 * AI ile CSV verilerini normalize eder
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CSVNormalizerService } from "@/lib/ai/csv-normalizer";
import type { NormalizationOptions } from "@/lib/ai/csv-normalizer";
import type { ColumnInfo } from "@/types/data-collection.types";

interface NormalizeRequestBody {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
  options?: NormalizationOptions;
}

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const supabase = await createClient() as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Yetkilendirme gerekli" },
        { status: 401 }
      );
    }

    // Request body'yi parse et
    const body: NormalizeRequestBody = await request.json();

    if (!body.data || !Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json(
        { success: false, error: "Veri gerekli" },
        { status: 400 }
      );
    }

    if (!body.columns || !Array.isArray(body.columns)) {
      return NextResponse.json(
        { success: false, error: "Kolon bilgileri gerekli" },
        { status: 400 }
      );
    }

    // API key kontrolü
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenRouter API Key yapılandırılmamış. Lütfen OPENROUTER_API_KEY environment variable'ını ayarlayın.",
        },
        { status: 500 }
      );
    }

    // Normalizer servisi oluştur
    const normalizer = new CSVNormalizerService(apiKey);

    // Varsayılan options
    const options: NormalizationOptions = {
      targetDateFormat: body.options?.targetDateFormat || "YYYY-MM-DD",
      numberLocale: body.options?.numberLocale || "tr-TR",
      nullHandling: body.options?.nullHandling || "keep",
      normalizeColumnNames: body.options?.normalizeColumnNames ?? true,
      fixInconsistentValues: body.options?.fixInconsistentValues ?? true,
      fixEncodingIssues: body.options?.fixEncodingIssues ?? true,
      trimWhitespace: body.options?.trimWhitespace ?? true,
      customRules: body.options?.customRules,
    };

    // Normalize et
    const result = await normalizer.normalize(body.data, body.columns, options);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Normalizasyon başarısız",
          processingTime: result.processingTime,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      normalizedData: result.normalizedData,
      normalizedColumns: result.normalizedColumns,
      changes: result.changes,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error("CSV normalize hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
