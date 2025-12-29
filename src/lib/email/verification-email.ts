/**
 * Email Verification Email Template
 * Resend ile doğrulama e-postası gönderme
 */

import { sendEmail, EmailResult } from "./resend-client";

// =============================================
// Verification Email Template
// =============================================

/**
 * E-posta doğrulama maili gönderir
 */
export async function sendVerificationEmail(
  to: string,
  verificationUrl: string,
  userName?: string
): Promise<EmailResult> {
  const displayName = userName || "Kullanıcı";
  
  return sendEmail({
    to,
    subject: "E-posta Adresinizi Doğrulayın - İş Zekası Platformu",
    html: generateVerificationEmailHtml(displayName, verificationUrl),
    text: generateVerificationEmailText(displayName, verificationUrl),
  });
}

/**
 * HTML email template
 */
function generateVerificationEmailHtml(userName: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-posta Doğrulama</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 60px; height: 60px; background-color: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 20px;">
              <h1 style="margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Merhaba ${userName}! 👋
              </h1>
              <p style="margin: 0; font-size: 16px; color: #52525b; text-align: center; line-height: 1.6;">
                İş Zekası Platformumuza hoş geldiniz. Hesabınızı aktifleştirmek için e-posta adresinizi doğrulayın.
              </p>
            </td>
          </tr>
          
          <!-- Button -->
          <tr>
            <td align="center" style="padding: 10px 40px 30px;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; transition: background-color 0.2s;">
                ✉️ E-postamı Doğrula
              </a>
            </td>
          </tr>
          
          <!-- Alternative Link -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a; text-align: center;">
                Buton çalışmıyorsa, aşağıdaki linki tarayıcınıza kopyalayın:
              </p>
              <p style="margin: 0; font-size: 12px; color: #2563eb; text-align: center; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 6px;">
                ${verificationUrl}
              </p>
            </td>
          </tr>
          
          <!-- Expiry Notice -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏰ Bu link <strong>1 saat</strong> içinde geçerliliğini yitirecektir.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 5px; font-size: 13px; color: #71717a; text-align: center;">
                Bu e-postayı siz talep etmediyseniz, güvenle görmezden gelebilirsiniz.
              </p>
              <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} İş Zekası Platformu
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Plain text email template
 */
function generateVerificationEmailText(userName: string, verificationUrl: string): string {
  return `
Merhaba ${userName}!

İş Zekası Platformumuza hoş geldiniz.

Hesabınızı aktifleştirmek için aşağıdaki linke tıklayın:

${verificationUrl}

Bu link 1 saat içinde geçerliliğini yitirecektir.

Bu e-postayı siz talep etmediyseniz, güvenle görmezden gelebilirsiniz.

---
© ${new Date().getFullYear()} İş Zekası Platformu
  `.trim();
}
