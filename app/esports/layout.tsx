"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Globe, 
  Newspaper, 
  Trophy, 
  Building2, 
  Target,
  ChevronLeft,
  Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FASE 54 REFACTOR: ESPORTS HUB LAYOUT
 * Dedicated layout with horizontal sub-navigation
 */

const hubNavItems = [
  { name: "News", href: "/esports", icon: Newspaper },
  { name: "World Rankings", href: "/esports/rankings", icon: Trophy },
  { name: "My Org", href: "/esports/org", icon: Building2 },
  { name: "Pracc Finder", href: "/esports/pracc", icon: Target },
  { name: "Tournaments", href: "/esports/tournaments", icon: Gamepad2 },
];

export default function EsportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hub Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">Voltar</span>
              </Link>
              <div className="h-6 w-px bg-zinc-800" />
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black text-white">ESPORTS HUB</span>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 font-medium">LIVE</span>
              </span>
            </div>
          </div>

          {/* Sub Navigation */}
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {hubNavItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/esports" && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                    isActive
                      ? "text-orange-500 border-orange-500"
                      : "text-zinc-400 border-transparent hover:text-white hover:border-zinc-600"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
}
