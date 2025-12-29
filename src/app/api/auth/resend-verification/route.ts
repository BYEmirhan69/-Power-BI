/**
 * Resend Verification Email API
 * Doğrulama e-postasını yeniden gönderir
 * 
 * POST /api/auth/resend-verification
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email gereklidir" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const normalizedEmail = email.toLowerCase();

    // Kullanıcıyı bul
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, email_verified")
      .eq("email", normalizedEmail)
      .single();

    if (profileError || !profile) {
      // Güvenlik: Kullanıcı bulunamasa bile aynı mesajı ver
      return NextResponse.json({
        success: true,
        message: "Eğer bu e-posta kayıtlıysa, doğrulama linki gönderilecektir.",
      });
    }

    // Zaten doğrulanmış mı?
    if (profile.email_verified) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten doğrulanmış.", alreadyVerified: true },
        { status: 400 }
      );
    }

    // Rate limit kontrolü
    const { data: rateLimit } = await supabase
      .from("verification_rate_limits")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

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
      .eq("user_id", profile.id)
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
        user_id: profile.id,
        token_hash: tokenHash,
        email: normalizedEmail,
        expires_at: expiresAt.toISOString(),
        ip_address: ip,
      });

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
        })
        .eq("email", normalizedEmail);
    } else {
      await supabase
        .from("verification_rate_limits")
        .insert({
          email: normalizedEmail,
          attempts: 1,
          first_attempt_at: now.toISOString(),
          last_attempt_at: now.toISOString(),
        });
    }

    // Doğrulama URL'ini oluştur
    const verificationUrl = getVerificationUrl(token);

    // E-posta gönder
    const emailResult = await sendVerificationEmail(
      normalizedEmail,
      verificationUrl,
      profile.full_name || undefined
    );

    if (!emailResult.success) {
      console.error("Email gönderme hatası:", emailResult.error);
      
      // Resend domain hatası kontrolü
      const isDomainError = emailResult.error?.includes("only send testing emails") ||
                           emailResult.error?.includes("verify a domain");
      
      if (isDomainError) {
        return NextResponse.json(
          { 
            error: "E-posta servisi test modunda. Sadece kayıtlı e-posta adresine mail gönderilebilir.",
            code: "RESEND_TEST_MODE",
            details: "Diğer adreslere mail göndermek için Resend dashboard'dan domain doğrulaması yapılmalı."
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: "E-posta gönderilemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    console.log(`Resend verification email sent to ${normalizedEmail}, messageId: ${emailResult.id}`);

    return NextResponse.json({
      success: true,
      message: "Doğrulama e-postası yeniden gönderildi.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
