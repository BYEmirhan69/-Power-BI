import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      const adminClient = createAdminClient();
      
      // Kullanıcının profilini kontrol et ve güncelle
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("id, email_verified, organization_id")
        .eq("id", data.user.id)
        .single();
      
      const profile = profileData as Pick<Profile, "id" | "email_verified" | "organization_id"> | null;

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
      }
      
      // Organizasyon yoksa onboarding'e yönlendir
      if (!profile?.organization_id) {
        return NextResponse.redirect(`${origin}/dashboard/onboarding`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
