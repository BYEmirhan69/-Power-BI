/**
 * Two-Factor Authentication (2FA) Service
 * TOTP tabanlı iki faktörlü kimlik doğrulama
 * Google Authenticator / Authy uyumlu
 */

import { createClient } from "@/lib/supabase/client";

// TOTP için gerekli sabitler
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // saniye
const TOTP_ALGORITHM = "SHA1";

// Base32 karakter seti
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Cryptographically secure random bytes üretir (browser uyumlu)
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Base32 encoding
 */
function base32Encode(buffer: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

/**
 * Base32 decoding
 */
function base32Decode(encoded: string): Uint8Array {
  const cleanedInput = encoded.replace(/=+$/, "").toUpperCase();
  const output = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleanedInput.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleanedInput[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * HMAC-SHA1 hesaplama (Web Crypto API ile)
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  // ArrayBuffer'a dönüştür (SharedArrayBuffer uyumsuzluğunu çözmek için)
  const keyBuffer = new Uint8Array(key).buffer as ArrayBuffer;
  const messageBuffer = new Uint8Array(message).buffer as ArrayBuffer;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageBuffer);
  return new Uint8Array(signature);
}

/**
 * TOTP kodu üretir
 */
async function generateTOTP(secret: string, timestamp?: number): Promise<string> {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / TOTP_PERIOD);

  // Counter'ı 8 byte big-endian olarak encode et
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  const key = base32Decode(secret);
  const hmac = await hmacSha1(key, counterBytes);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * TOTP kodunu doğrular (zaman kayması için window kontrolü)
 */
async function verifyTOTP(
  secret: string,
  token: string,
  window: number = 1
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const checkTime = currentTime + i * TOTP_PERIOD;
    const expectedToken = await generateTOTP(secret, checkTime);

    if (token === expectedToken) {
      return true;
    }
  }

  return false;
}

/**
 * Güvenli secret key üretir
 */
function generateSecret(): string {
  const bytes = getRandomBytes(20); // 160 bit
  return base32Encode(bytes);
}

/**
 * Recovery kodları üretir
 */
function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const bytes = getRandomBytes(5);
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }

  return codes;
}

/**
 * OTPAuth URI oluşturur (QR kod için)
 */
function generateOTPAuthURI(
  secret: string,
  email: string,
  issuer: string = "BI Platform"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);

  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// =============================================
// 2FA Service Interface
// =============================================

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  otpauthUri: string;
  recoveryCodes: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  isVerified: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Two-Factor Authentication Service
 */
export class TwoFactorAuthService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: any = createClient();

  /**
   * 2FA kurulumu başlatır
   */
  async initializeSetup(userId: string, email: string): Promise<TwoFactorSetupData> {
    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes(10);
    const otpauthUri = generateOTPAuthURI(secret, email);

    // QR kod URL'i (Google Charts API kullanarak)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

    // Veritabanına kaydet (henüz aktif değil)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any).from("user_2fa").upsert({
      user_id: userId,
      secret_encrypted: secret, // Production'da encrypt edilmeli
      backup_codes_encrypted: JSON.stringify(recoveryCodes), // Production'da encrypt edilmeli
      is_enabled: false,
      is_verified: false,
      recovery_codes_remaining: recoveryCodes.length,
    });

    if (error) {
      throw new Error(`2FA kurulumu başlatılamadı: ${error.message}`);
    }

    return {
      secret,
      qrCodeUrl,
      otpauthUri,
      recoveryCodes,
    };
  }

  /**
   * 2FA kurulumunu doğrular ve aktifleştirir
   */
  async verifyAndEnable(userId: string, token: string): Promise<VerifyResult> {
    // Secret'ı al
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: twoFaData, error: fetchError } = await (this.supabase as any)
      .from("user_2fa")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError || !twoFaData) {
      return { success: false, error: "2FA ayarları bulunamadı" };
    }

    // Token'ı doğrula
    const isValid = await verifyTOTP(twoFaData.secret_encrypted as string, token);

    if (!isValid) {
      // Başarısız denemeyi logla
      await this.logAttempt(userId, "setup", false);
      return { success: false, error: "Geçersiz doğrulama kodu" };
    }

    // 2FA'yı aktifleştir
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (this.supabase as any)
      .from("user_2fa")
      .update({
        is_enabled: true,
        is_verified: true,
        enabled_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return { success: false, error: "2FA aktifleştirilemedi" };
    }

    await this.logAttempt(userId, "setup", true);
    return { success: true };
  }

  /**
   * TOTP kodu ile doğrulama
   */
  async verifyToken(userId: string, token: string, ipAddress?: string): Promise<VerifyResult> {
    // Rate limiting kontrolü
    const isBlocked = await this.checkRateLimit(userId);
    if (isBlocked) {
      return { success: false, error: "Çok fazla başarısız deneme. Lütfen bekleyin." };
    }

    // Secret'ı al
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: twoFaData, error: fetchError } = await (this.supabase as any)
      .from("user_2fa")
      .select("*")
      .eq("user_id", userId)
      .eq("is_enabled", true)
      .single();

    if (fetchError || !twoFaData) {
      return { success: false, error: "2FA etkin değil" };
    }

    // Token'ı doğrula
    const isValid = await verifyTOTP(twoFaData.secret_encrypted as string, token);

    if (!isValid) {
      await this.logAttempt(userId, "totp", false, ipAddress);
      return { success: false, error: "Geçersiz doğrulama kodu" };
    }

    // Başarılı - last_used_at güncelle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from("user_2fa")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId);

    await this.logAttempt(userId, "totp", true, ipAddress);
    return { success: true };
  }

  /**
   * Recovery kod ile doğrulama
   */
  async verifyRecoveryCode(
    userId: string,
    code: string,
    ipAddress?: string
  ): Promise<VerifyResult> {
    // Secret ve recovery kodlarını al
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: twoFaData, error: fetchError } = await (this.supabase as any)
      .from("user_2fa")
      .select("*")
      .eq("user_id", userId)
      .eq("is_enabled", true)
      .single();

    if (fetchError || !twoFaData) {
      return { success: false, error: "2FA etkin değil" };
    }

    const recoveryCodes: string[] = JSON.parse(twoFaData.backup_codes_encrypted || "[]");
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const formattedCode = `${normalizedCode.slice(0, 5)}-${normalizedCode.slice(5)}`;

    const codeIndex = recoveryCodes.indexOf(formattedCode);

    if (codeIndex === -1) {
      await this.logAttempt(userId, "backup_code", false, ipAddress);
      return { success: false, error: "Geçersiz kurtarma kodu" };
    }

    // Kullanılan kodu kaldır
    recoveryCodes.splice(codeIndex, 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any)
      .from("user_2fa")
      .update({
        backup_codes_encrypted: JSON.stringify(recoveryCodes),
        recovery_codes_remaining: recoveryCodes.length,
        last_used_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    await this.logAttempt(userId, "backup_code", true, ipAddress);
    return { success: true };
  }

  /**
   * 2FA'yı devre dışı bırakır
   */
  async disable(userId: string, token: string): Promise<VerifyResult> {
    // Önce mevcut token ile doğrula
    const verifyResult = await this.verifyToken(userId, token);
    if (!verifyResult.success) {
      return verifyResult;
    }

    // 2FA'yı devre dışı bırak
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from("user_2fa")
      .update({
        is_enabled: false,
        is_verified: false,
        enabled_at: null,
      })
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: "2FA devre dışı bırakılamadı" };
    }

    return { success: true };
  }

  /**
   * Yeni recovery kodları üretir
   */
  async regenerateRecoveryCodes(userId: string, token: string): Promise<string[] | null> {
    // Önce mevcut token ile doğrula
    const verifyResult = await this.verifyToken(userId, token);
    if (!verifyResult.success) {
      return null;
    }

    const newCodes = generateRecoveryCodes(10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (this.supabase as any)
      .from("user_2fa")
      .update({
        backup_codes_encrypted: JSON.stringify(newCodes),
        recovery_codes_remaining: newCodes.length,
      })
      .eq("user_id", userId);

    if (error) {
      return null;
    }

    return newCodes;
  }

  /**
   * 2FA durumunu getirir
   */
  async getStatus(userId: string): Promise<TwoFactorStatus | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (this.supabase as any)
      .from("user_2fa")
      .select("is_enabled, is_verified, enabled_at, recovery_codes_remaining")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return {
        isEnabled: false,
        isVerified: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
      };
    }

    return {
      isEnabled: data.is_enabled,
      isVerified: data.is_verified,
      enabledAt: data.enabled_at,
      recoveryCodesRemaining: data.recovery_codes_remaining,
    };
  }

  /**
   * Deneme logla
   */
  private async logAttempt(
    userId: string,
    attemptType: "totp" | "backup_code" | "setup",
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.supabase as any).from("two_factor_attempts").insert({
      user_id: userId,
      attempt_type: attemptType,
      success,
      ip_address: ipAddress,
    });
  }

  /**
   * Rate limiting kontrolü (son 15 dakikada 5'ten fazla başarısız deneme)
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (this.supabase as any)
      .from("two_factor_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("success", false)
      .gte("created_at", fifteenMinutesAgo);

    return (count ?? 0) >= 5;
  }
}

// Singleton instance
export const twoFactorAuth = new TwoFactorAuthService();

// Export utility functions for testing
export { generateTOTP, verifyTOTP, generateSecret, generateRecoveryCodes };
