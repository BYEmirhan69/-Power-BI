/**
 * Email Send API Route
 * POST /api/email/send
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendEmail, sendTestEmail } from "@/lib/email/resend-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, to, subject, html, text } = body;

    // Test e-postası gönder
    if (action === "test") {
      const result = await sendTestEmail();
      return NextResponse.json(result);
    }

    // Gerekli alanları kontrol et
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { success: false, error: "to, subject ve html/text alanları zorunludur" },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, html, text });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email API hatası:", error);
    return NextResponse.json(
      { success: false, error: "E-posta gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
