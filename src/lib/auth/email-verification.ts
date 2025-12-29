/**
 * Email Verification Utilities
 * Token üretimi, hashleme ve doğrulama işlemleri
 */

import { createHash, randomBytes } from "crypto";

// =============================================
// Constants
// =============================================

/** Token geçerlilik süresi (ms) - 1 saat */
export const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/** Rate limit - aynı email için bekleme süresi (ms) - 60 saniye */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/** Rate limit - maksimum deneme sayısı (5 dakika içinde) */
export const MAX_ATTEMPTS_PER_WINDOW = 5;

/** Rate limit window (ms) - 5 dakika */
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/** Block süresi aşıldığında (ms) - 15 dakika */
export const BLOCK_DURATION_MS = 15 * 60 * 1000;

// =============================================
// Token Functions
// =============================================

/**
 * Güvenli, rastgele doğrulama token'ı oluşturur
 * 32 byte = 256 bit entropy
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Token'ı SHA-256 ile hashler
 * DB'de plaintext token saklamak yerine hash saklarız
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Token'ın geçerliliğini kontrol eder
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Token'ın geçerlilik süresini hesaplar
 */
export function getTokenExpiryDate(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY_MS);
}

// =============================================
// Email Masking
// =============================================

/**
 * Email adresini maskeler: emirhan@gmail.com -> e***@g***.com
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) return email;

  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const maskedLocal = localPart.charAt(0) + "***";
  const maskedDomain = domainName.charAt(0) + "***";

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

// =============================================
// Rate Limiting
// =============================================

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  message?: string;
}

/**
 * Rate limit kontrolü yapar
 */
export function checkRateLimit(
  attempts: number,
  firstAttemptAt: Date,
  lastAttemptAt: Date,
  blockedUntil: Date | null
): RateLimitResult {
  const now = new Date();

  // Eğer block süresi varsa kontrol et
  if (blockedUntil && now < blockedUntil) {
    const retryAfterMs = blockedUntil.getTime() - now.getTime();
    return {
      allowed: false,
      retryAfterMs,
      message: `Çok fazla deneme yaptınız. ${Math.ceil(retryAfterMs / 1000 / 60)} dakika sonra tekrar deneyin.`,
    };
  }

  // Cooldown kontrolü - son denemeden bu yana 60 saniye geçti mi?
  const timeSinceLastAttempt = now.getTime() - lastAttemptAt.getTime();
  if (timeSinceLastAttempt < RESEND_COOLDOWN_MS) {
    const retryAfterMs = RESEND_COOLDOWN_MS - timeSinceLastAttempt;
    return {
      allowed: false,
      retryAfterMs,
      message: `Lütfen ${Math.ceil(retryAfterMs / 1000)} saniye bekleyin.`,
    };
  }

  // Window içindeki deneme sayısı kontrolü
  const timeSinceFirstAttempt = now.getTime() - firstAttemptAt.getTime();
  if (timeSinceFirstAttempt < RATE_LIMIT_WINDOW_MS && attempts >= MAX_ATTEMPTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterMs: BLOCK_DURATION_MS,
      message: `Çok fazla deneme yaptınız. 15 dakika sonra tekrar deneyin.`,
    };
  }

  return { allowed: true };
}

// =============================================
// Verification URL
// =============================================

/**
 * Doğrulama URL'i oluşturur
 */
export function getVerificationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/auth/verify-email?token=${token}`;
}

// =============================================
// Types
// =============================================

export interface EmailVerificationToken {
  id: string;
  userId: string;
  tokenHash: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  ipAddress: string | null;
}

export interface VerificationRateLimit {
  id: string;
  email: string;
  attempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  blockedUntil: Date | null;
}
