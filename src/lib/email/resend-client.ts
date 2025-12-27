/**
 * Resend Email Client
 * Modüler ve yeniden kullanılabilir e-posta gönderme fonksiyonları
 */

import { Resend } from "resend";

// =============================================
// Types
// =============================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// =============================================
// Resend Client Singleton
// =============================================

let resendInstance: Resend | null = null;

function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// =============================================
// Email Functions
// =============================================

/**
 * Temel e-posta gönderme fonksiyonu
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: options.from || "onboarding@resend.dev",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      headers: options.headers,
      attachments: options.attachments,
    });

    if (error) {
      console.error("Email gönderme hatası:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("Email gönderme hatası:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Hoşgeldin e-postası gönder
 */
export async function sendWelcomeEmail(
  to: string,
  userName: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Hoş Geldiniz! 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Merhaba ${userName}!</h1>
        <p>İş Zekası Platformumuza hoş geldiniz.</p>
        <p>Artık verilerinizi analiz etmeye ve görselleştirmeye başlayabilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          Herhangi bir sorunuz varsa, bize ulaşmaktan çekinmeyin.
        </p>
      </div>
    `,
  });
}

/**
 * Şifre sıfırlama e-postası gönder
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: "Şifre Sıfırlama Talebi",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Şifre Sıfırlama</h1>
        <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <a href="${resetLink}" style="
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        ">Şifremi Sıfırla</a>
        <p style="color: #6b7280; font-size: 14px;">
          Bu linkin 1 saat içinde süresi dolacaktır.
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  });
}

/**
 * Rapor hazır bildirimi gönder
 */
export async function sendReportReadyEmail(
  to: string,
  reportName: string,
  downloadLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `Raporunuz Hazır: ${reportName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">📊 Raporunuz Hazır!</h1>
        <p><strong>${reportName}</strong> raporunuz başarıyla oluşturuldu.</p>
        <a href="${downloadLink}" style="
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        ">Raporu İndir</a>
        <p style="color: #6b7280; font-size: 14px;">
          Bu link 7 gün boyunca geçerli olacaktır.
        </p>
      </div>
    `,
  });
}

/**
 * Davet e-postası gönder
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  organizationName: string,
  inviteLink: string
): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: `${organizationName} organizasyonuna davet edildiniz`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Davet Aldınız! 🎉</h1>
        <p><strong>${inviterName}</strong> sizi <strong>${organizationName}</strong> organizasyonuna davet etti.</p>
        <a href="${inviteLink}" style="
          display: inline-block;
          background-color: #2563eb;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        ">Daveti Kabul Et</a>
        <p style="color: #6b7280; font-size: 14px;">
          Bu davet 7 gün içinde geçerliliğini yitirecektir.
        </p>
      </div>
    `,
  });
}

// =============================================
// Test Function
// =============================================

/**
 * Test e-postası gönder (örnek kullanım)
 */
export async function sendTestEmail(): Promise<EmailResult> {
  return sendEmail({
    to: "emirhanayd69@gmail.com",
    subject: "Merhaba Dünya",
    html: "<p>İlk e-postanızı gönderdiğiniz için tebrikler!</p>",
  });
}
