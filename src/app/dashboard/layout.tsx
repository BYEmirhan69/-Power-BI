"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, Header } from "@/components/layout";
import { ThemeProvider, SWRProvider } from "@/components/providers";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
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
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-background">
              <Header />
              <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/20">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </AuthProvider>
      </SWRProvider>
    </ThemeProvider>
  );
}
