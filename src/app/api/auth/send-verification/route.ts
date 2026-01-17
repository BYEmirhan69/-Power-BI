/**
 * Send Verification Email API
 * Yeni kullanıcıya doğrulama e-postası gönderir
 * 
 * POST /api/auth/send-verification
 * Body: { email: string, userId: string, fullName?: string }
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  generateVerificationToken,
  hashToken,
  getTokenExpiryDate,
  getVerificationUrl,
  checkRateLimit,
  BLOCK_DURATION_MS,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/auth/email-verification";
import { sendVerificationEmail } from "@/lib/email/verification-email";

// Type for rate limit data
interface RateLimitData {
  id: string;
  email: string;
  attempts: number;
  first_attempt_at: string;
  last_attempt_at: string;
  blocked_until: string | null;
}

// Profil yoksa oluştur
async function ensureProfile(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string,
  fullName?: string
): Promise<boolean> {
  // Önce mevcut profili kontrol et
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (existingProfile) {
    return true;
  }

  // Profil yoksa oluştur
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: email.toLowerCase(),
      full_name: fullName || null,
      role: "user",
      email_verified: false,
    } as never);

  if (error) {
    console.error("Profil oluşturma hatası:", error);
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId, fullName } = body;

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email ve userId gereklidir" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Profil yoksa oluştur
    await ensureProfile(supabase, userId, email, fullName);

    // Rate limit kontrolü
    const { data: rateLimitRaw } = await supabase
      .from("verification_rate_limits")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    const rateLimit = rateLimitRaw as RateLimitData | null;

    if (rateLimit) {
      const result = checkRateLimit(
        rateLimit.attempts,
        new Date(rateLimit.first_attempt_at),
        new Date(rateLimit.last_attempt_at),
        rateLimit.blocked_until ? new Date(rateLimit.blocked_until) : null
      );

      if (!result.allowed) {
        return NextResponse.json(
          { error: result.message, retryAfterMs: result.retryAfterMs },
          { status: 429 }
        );
      }
    }

    // Önceki kullanılmamış tokenları geçersiz kıl
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId)
      .is("used_at", null);

    // Yeni token oluştur
    const token = generateVerificationToken();
    const tokenHash = hashToken(token);
    const expiresAt = getTokenExpiryDate();

    // IP adresini al
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || null;

    // Token'ı kaydet
    const { error: tokenError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token_hash: tokenHash,
        email: email.toLowerCase(),
        expires_at: expiresAt.toISOString(),
        ip_address: ip,
      } as never);

    if (tokenError) {
      console.error("Token kaydetme hatası:", tokenError);
      return NextResponse.json(
        { error: "Token oluşturulamadı" },
        { status: 500 }
      );
    }

    // Rate limit güncelle
    const now = new Date();
    if (rateLimit) {
      const timeSinceFirst = now.getTime() - new Date(rateLimit.first_attempt_at).getTime();
      const newAttempts = timeSinceFirst < RATE_LIMIT_WINDOW_MS ? rateLimit.attempts + 1 : 1;
      const shouldBlock = newAttempts >= 5;

      await supabase
        .from("verification_rate_limits")
        .update({
          attempts: newAttempts,
          first_attempt_at: timeSinceFirst < RATE_LIMIT_WINDOW_MS 
            ? rateLimit.first_attempt_at 
            : now.toISOString(),
          last_attempt_at: now.toISOString(),
          blocked_until: shouldBlock 
            ? new Date(now.getTime() + BLOCK_DURATION_MS).toISOString() 
            : null,
        } as never)
        .eq("email", email.toLowerCase());
    } else {
      await supabase
        .from("verification_rate_limits")
        .insert({
          email: email.toLowerCase(),
          attempts: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
        } as never);
    }

    // Doğrulama URL'ini oluştur
    const verificationUrl = getVerificationUrl(token);

    // E-posta gönder
    const emailResult = await sendVerificationEmail(
      email,
      verificationUrl,
      fullName
    );

    if (!emailResult.success) {
      console.error("Email gönderme hatası:", emailResult.error);
      
      // Resend domain hatası kontrolü
      const isDomainError = emailResult.error?.includes("only send testing emails") ||
                           emailResult.error?.includes("verify a domain");
      
      if (isDomainError) {
        return NextResponse.json(
          { 
            success: false,
            error: "E-posta servisi test modunda. Sadece kayıtlı e-posta adresine mail gönderilebilir.",
            code: "RESEND_TEST_MODE",
            details: "Diğer adreslere mail göndermek için Resend dashboard'dan domain doğrulaması yapılmalı."
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: emailResult.error || "E-posta gönderilemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Doğrulama e-postası gönderildi",
    });
  } catch (error) {
    console.error("Send verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Bir hata oluştu";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
