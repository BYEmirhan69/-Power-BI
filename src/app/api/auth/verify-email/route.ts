/**
 * Verify Email API
 * Token ile e-posta doğrulama
 * 
 * GET /api/auth/verify-email?token=...
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { hashToken, isTokenExpired } from "@/lib/auth/email-verification";

// Type for token data
interface TokenData {
  id: string;
  user_id: string;
  token_hash: string;
  email: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  ip_address: string | null;
}

// Type for profile data
interface ProfileData {
  email_verified: boolean | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?result=invalid", request.url)
      );
    }

    const supabase = createAdminClient();
    const tokenHash = hashToken(token);

    // Token'ı bul
    const { data: tokenDataRaw, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .single();

    const tokenData = tokenDataRaw as TokenData | null;

    if (tokenError || !tokenData) {
      console.error("Token bulunamadı:", tokenError);
      return NextResponse.redirect(
        new URL("/auth/verify-email?result=invalid", request.url)
      );
    }

    // Token kullanılmış mı?
    if (tokenData.used_at) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?result=already-verified", request.url)
      );
    }

    // Token süresi dolmuş mu?
    if (isTokenExpired(new Date(tokenData.expires_at))) {
      return NextResponse.redirect(
        new URL(`/auth/verify-email?result=expired&email=${encodeURIComponent(tokenData.email)}`, request.url)
      );
    }

    // Kullanıcının zaten doğrulanmış olup olmadığını kontrol et
    const { data: profileRaw } = await supabase
      .from("profiles")
      .select("email_verified")
      .eq("id", tokenData.user_id)
      .single();

    const profile = profileRaw as ProfileData | null;

    if (profile?.email_verified) {
      // Token'ı kullanılmış olarak işaretle
      await supabase
        .from("email_verification_tokens")
        .update({ used_at: new Date().toISOString() } as never)
        .eq("id", tokenData.id);

      return NextResponse.redirect(
        new URL("/auth/verify-email?result=already-verified", request.url)
      );
    }

    // Token'ı kullanılmış olarak işaretle
    const { error: updateTokenError } = await supabase
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() } as never)
      .eq("id", tokenData.id);

    if (updateTokenError) {
      console.error("Token güncelleme hatası:", updateTokenError);
    }

    // Profile'ı doğrulanmış olarak işaretle
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        email_verified: true,
        email_verified_at: new Date().toISOString(),
      } as never)
      .eq("id", tokenData.user_id);

    if (updateProfileError) {
      console.error("Profile güncelleme hatası:", updateProfileError);
      return NextResponse.redirect(
        new URL("/auth/verify-email?result=error", request.url)
      );
    }

    // Supabase Auth'ta da kullanıcının email'ini doğrula
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (authUpdateError) {
      console.error("Supabase Auth güncelleme hatası:", authUpdateError);
      // Profile güncellendi, auth güncellenmese de devam et
    }

    // Başarılı doğrulama
    console.log(`Email verified for user ${tokenData.user_id}`);
    return NextResponse.redirect(
      new URL("/auth/verify-email?result=success", request.url)
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.redirect(
      new URL("/auth/verify-email?result=error", request.url)
    );
  }
}
