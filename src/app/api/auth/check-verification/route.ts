/**
 * Check Email Verification Status API
 * Kullanıcının e-posta doğrulama durumunu kontrol eder
 * 
 * GET /api/auth/check-verification?email=...
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Type for profile data
interface ProfileData {
  email_verified: boolean | null;
  email_verified_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email gereklidir" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: profileRaw, error } = await supabase
      .from("profiles")
      .select("email_verified, email_verified_at")
      .eq("email", email.toLowerCase())
      .single();

    const profile = profileRaw as ProfileData | null;

    if (error || !profile) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: profile.email_verified || false,
      verifiedAt: profile.email_verified_at,
    });
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
