"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  Settings,
  Upload,
  Users,
  FileText,
  Activity,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";

const mainNavItems = [
  {
    title: "Ana Sayfa",
    url: "/dashboard",
    icon: Home,
    prefetch: true, // Kritik route
  },
  {
    title: "Dashboardlar",
    url: "/dashboard/boards",
    icon: LayoutDashboard,
    prefetch: true, // Sık kullanılan
  },
  {
    title: "Grafikler",
    url: "/dashboard/charts",
    icon: BarChart3,
    prefetch: true, // Sık kullanılan
  },
  {
    title: "Veri Setleri",
    url: "/dashboard/datasets",
    icon: FileSpreadsheet,
    prefetch: true, // Sık kullanılan
  },
];

const dataNavItems = [
  {
    title: "Veri Kaynakları",
    url: "/dashboard/data-sources",
    icon: Database,
    prefetch: false,
  },
  {
    title: "Veri İçe Aktar",
    url: "/dashboard/data-import",
    icon: Upload,
    prefetch: false,
  },
];

const reportNavItems = [
  {
    title: "Raporlar",
    url: "/dashboard/reports",
    icon: FileText,
    prefetch: false,
  },
  {
    title: "Aktivite Logları",
    url: "/dashboard/activity",
    icon: Activity,
    prefetch: false,
  },
];

const adminNavItems = [
  {
    title: "Kullanıcılar",
    url: "/dashboard/users",
    icon: Users,
    prefetch: false,
  },
  {
    title: "Ayarlar",
    url: "/dashboard/settings",
    icon: Settings,
    prefetch: false,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border/40">
      <SidebarHeader className="border-b border-sidebar-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">Power BI Platform</span>
            <span className="text-xs text-sidebar-muted">İş Zekası</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] font-semibold uppercase tracking-wider px-2">Genel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} prefetch={item.prefetch}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] font-semibold uppercase tracking-wider px-2">Veri Yönetimi</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dataNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} prefetch={item.prefetch}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] font-semibold uppercase tracking-wider px-2">Raporlama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} prefetch={item.prefetch}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-[11px] font-semibold uppercase tracking-wider px-2">Yönetim</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} prefetch={item.prefetch}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50">
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
