"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";

export function Header() {
  const router = useRouter();

  const handleViewAllNotifications = () => {
    router.push("/dashboard/settings?tab=notifications");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-card/95 backdrop-blur-sm px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 hover:bg-muted" />
        <Separator orientation="vertical" className="mr-2 h-4 bg-border/40" />
        
        {/* Search - Modern clean style */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ara..."
            className="w-[200px] pl-9 lg:w-[280px] h-9 bg-muted/40 border-border/40 focus:bg-card transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications - Her 30 saniyede polling, realtime destekli */}
        <NotificationBell 
          pollingInterval={30000}
          maxNotifications={10}
          onViewAll={handleViewAllNotifications}
        />
      </div>
    </header>
  );
}
