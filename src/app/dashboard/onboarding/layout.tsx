"use client";

import { ThemeProvider, SWRProvider } from "@/components/providers";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SWRProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </SWRProvider>
    </ThemeProvider>
  );
}
