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
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ara..."
            className="w-[200px] pl-8 lg:w-[300px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
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
