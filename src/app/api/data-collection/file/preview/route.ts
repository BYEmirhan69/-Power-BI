/**
 * API Route: File Preview
 * Yüklenen dosyadan önizleme alır
 */

import { NextRequest, NextResponse } from "next/server";
import { fileParserService } from "@/lib/data-collection";
import { FileUploadConfigSchema } from "@/types/data-collection.types";
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

    // Form data'yı parse et
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const configStr = formData.get("config") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Dosya gerekli" },
        { status: 400 }
      );
    }

    // Config parse et
    let config = {};
    if (configStr) {
      try {
        const parsed = JSON.parse(configStr);
        const parseResult = FileUploadConfigSchema.partial().safeParse(parsed);
        if (parseResult.success) {
          config = parseResult.data;
        }
      } catch {
        // Config parse edilemezse varsayılan kullan
      }
    }

    // Önizleme al
    const previewRows = parseInt(formData.get("previewRows") as string) || 100;
    const result = await fileParserService.preview(file, config, previewRows);

    return NextResponse.json(result);
  } catch (error) {
    console.error("File preview hatası:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Dosya boyutu limiti
export const config = {
  api: {
    bodyParser: false,
  },
};
