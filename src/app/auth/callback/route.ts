import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Profil yoksa oluştur
async function ensureProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  user: { id: string; email?: string; user_metadata?: { full_name?: string } }
): Promise<Pick<Profile, "id" | "email_verified" | "organization_id"> | null> {
  // Önce mevcut profili kontrol et
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id, email_verified, organization_id")
    .eq("id", user.id)
    .single();

  if (existingProfile) {
    return existingProfile as Pick<Profile, "id" | "email_verified" | "organization_id">;
  }

  // Profil yoksa oluştur
  const { data: newProfile, error } = await adminClient
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || null,
      role: "user",
      email_verified: true, // Callback'den geldiği için doğrulanmış kabul et
      email_verified_at: new Date().toISOString(),
    } as never)
    .select("id, email_verified, organization_id")
    .single();

  if (error) {
    console.error("Profil oluşturma hatası:", error);
    return null;
  }

  return newProfile as Pick<Profile, "id" | "email_verified" | "organization_id">;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      const adminClient = createAdminClient();
      
      // Kullanıcının profilini kontrol et veya oluştur
      const profile = await ensureProfile(adminClient, data.user);

      if (profile) {
        // Email doğrulandı olarak işaretle (Supabase callback'ten geldiği için)
        if (!profile.email_verified) {
          await adminClient
            .from("profiles")
            .update({
              email_verified: true,
              email_verified_at: new Date().toISOString(),
            } as never)
            .eq("id", data.user.id);
        }
        
        // Organizasyon yoksa onboarding'e yönlendir
        if (!profile.organization_id) {
          return NextResponse.redirect(`${origin}/dashboard/onboarding`);
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
