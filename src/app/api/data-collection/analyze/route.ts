/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Route: CSV Analyze
 * CSV verilerini analiz eder ve AI normalizasyonu gerekip gerekmediğini belirler
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CSVNormalizerService } from "@/lib/ai/csv-normalizer";
import type { ColumnInfo } from "@/types/data-collection.types";

interface AnalyzeRequestBody {
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
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
    const body: AnalyzeRequestBody = await request.json();

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

    // Hızlı analiz yap (AI kullanmadan)
    const normalizer = new CSVNormalizerService();
    const analysis = normalizer.analyzeQuick(body.data, body.columns);

    return NextResponse.json({
      success: true,
      issues: analysis.issues,
      needsAINormalization: analysis.needsAINormalization,
      issueCount: analysis.issues.length,
    });
  } catch (error) {
    console.error("CSV analyze hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
