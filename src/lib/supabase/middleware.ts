import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase yapılandırması eksikse, middleware'i atla
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not configured, skipping auth middleware");
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Protected routes
  const protectedRoutes = ["/dashboard", "/settings", "/reports"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Auth routes
  const authRoutes = ["/auth/login", "/auth/register"];
  const isAuthRoute = authRoutes.some(
    (route) => request.nextUrl.pathname === route
  );

  // Eğer korumalı veya auth route değilse, erken çık
  if (!isProtectedRoute && !isAuthRoute) {
    return supabaseResponse;
  }

  // Sadece gerekli route'larda auth kontrolü yap
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // Auth hatası durumunda sessizce devam et
    console.error("Auth check failed:", error);
  }

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Onboarding sayfasına erişim - giriş yapmış kullanıcılar için izin ver
  const isOnboardingRoute = request.nextUrl.pathname === "/dashboard/onboarding";
  
  // Dashboard sayfalarında organizasyon kontrolü (sadece user varsa)
  if (user && isProtectedRoute && !isOnboardingRoute) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      
      if (!profile?.organization_id) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard/onboarding";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      // Profile kontrolü başarısız olursa devam et
      console.error("Profile check failed:", error);
    }
  }
  
  // Onboarding'de olan ve org'u olan kullanıcıyı dashboard'a yönlendir
  if (user && isOnboardingRoute) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.organization_id) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("Onboarding profile check failed:", error);
    }
  }

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
