/**
 * API Route: Validate Data
 * Veriyi doğrular ve temizler
 */

import { NextRequest, NextResponse } from "next/server";
import { validationPipeline, classificationService } from "@/lib/data-collection";
import { CleaningOptionsSchema } from "@/types/data-collection.types";
import { createClient } from "@/lib/supabase/server";
import type { ColumnInfo, ValidationRule } from "@/types/data-collection.types";

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
    const { data, columns, rules, cleaningOptions, autoClassify } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: "Veri gerekli (array formatında)" },
        { status: 400 }
      );
    }

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: "Kolon bilgileri gerekli" },
        { status: 400 }
      );
    }

    // Cleaning options validasyonu
    let parsedCleaningOptions = {};
    if (cleaningOptions) {
      const parseResult = CleaningOptionsSchema.partial().safeParse(cleaningOptions);
      if (parseResult.success) {
        parsedCleaningOptions = parseResult.data;
      }
    }

    // Validasyon ve temizleme
    const validationResult = validationPipeline.validate(
      data as Record<string, unknown>[],
      columns as ColumnInfo[],
      rules as ValidationRule[] | undefined,
      parsedCleaningOptions
    );

    // Otomatik sınıflandırma
    let classification = null;
    if (autoClassify && validationResult.cleanedData) {
      classification = classificationService.classify(
        columns as ColumnInfo[],
        validationResult.cleanedData
      );
    }

    return NextResponse.json({
      validation: validationResult,
      classification,
    });
  } catch (error) {
    console.error("Validation hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
