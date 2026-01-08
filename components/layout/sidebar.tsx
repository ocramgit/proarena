"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Trophy, User, Shield, MessageSquare, ShoppingBag, Zap, Coins } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useCurrentUser } from "@/contexts/UserContext"
import { cn } from "@/lib/utils"

const getNavItems = (currentUser: any) => [
  {
    name: "Jogar",
    href: "/",
    icon: Gamepad2,
  },
  {
    name: "Wagers",
    href: "/wagers",
    icon: Coins,
    highlight: true, // FASE 54: P2P Betting
  },
  {
    name: "Perfil",
    href: currentUser?.nickname 
      ? `/profile/@${currentUser.nickname}` 
      : currentUser?.clerkId 
        ? `/profile/${currentUser.clerkId}`
        : "/profile",
    icon: User,
  },
  {
    name: "Torneios",
    href: "/tournaments",
    icon: Trophy,
  },
  {
    name: "Loja",
    href: "/store",
    icon: ShoppingBag,
  },
  {
    name: "Suporte",
    href: "/support",
    icon: MessageSquare,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { currentUser } = useCurrentUser() // FASE 41: Use centralized user context
  
  // Only check admin/staff roles when needed (not on every render)
  const isAdmin = useQuery(api.admin.isAdmin)
  const staffRole = useQuery(api.staff.getMyStaffRole)

  const navItems = getNavItems(currentUser)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-full flex-col">
        {/* Navigation - starts from top, no logo */}
        <nav className="flex-1 space-y-1 p-4 pt-20">
          {navItems.map((item: any) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            const isHighlight = item.highlight

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-4 border-orange-600 bg-zinc-900/50 text-zinc-100"
                    : isHighlight
                      ? "text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 border border-yellow-500/20 hover:border-yellow-500/40"
                      : "text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-100"
                )}
              >
                <Icon className={cn("h-5 w-5", isHighlight && "text-yellow-500")} />
                <span>{item.name}</span>
                {isHighlight && (
                  <span className="ml-auto text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">
                    NEW
                  </span>
                )}
              </Link>
            )
          })}
          {/* FASE 37: Segregated UI based on role */}
          
          {/* Admin Dashboard - Only for SUPER_ADMIN and ADMIN */}
          {(staffRole === "SUPER_ADMIN" || staffRole === "ADMIN" || isAdmin) && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                pathname === "/admin" || (pathname?.startsWith("/admin") && !pathname?.startsWith("/admin/tickets"))
                  ? "border-l-4 border-red-600 bg-red-900/20 text-red-500"
                  : "text-red-400 hover:bg-red-900/10 hover:text-red-300"
              )}
            >
              <Shield className="h-5 w-5" />
              <span className="font-black">ADMIN</span>
            </Link>
          )}
          
          {/* Tickets Hub - For ADMIN and SUPPORT */}
          {(staffRole === "SUPER_ADMIN" || staffRole === "ADMIN" || staffRole === "SUPPORT" || isAdmin) && (
            <Link
              href="/admin/tickets"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                pathname?.startsWith("/admin/tickets")
                  ? "border-l-4 border-blue-600 bg-blue-900/20 text-blue-500"
                  : "text-blue-400 hover:bg-blue-900/10 hover:text-blue-300"
              )}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="font-black">TICKETS</span>
            </Link>
          )}
        </nav>

        {/* ESPORTS HUB Portal - Premium Compact Pill */}
        <div className="px-4 pb-4">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-4" />
          <Link
            href="/esports"
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition-all overflow-hidden group",
              pathname?.startsWith("/esports")
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/40"
                : "bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-400"
            )}
          >
            {/* Animated glow effect on hover */}
            <div className={cn(
              "absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              !pathname?.startsWith("/esports") && "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10"
            )} />
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            
            <Zap className={cn(
              "h-4 w-4 relative z-10",
              pathname?.startsWith("/esports") ? "text-white" : "text-amber-500 group-hover:text-amber-400"
            )} />
            <span className="relative z-10 tracking-wide">ESPORTS</span>
            
            {/* Live indicator pulse */}
            <span className={cn(
              "relative z-10 flex h-2 w-2",
              pathname?.startsWith("/esports") ? "opacity-100" : "opacity-60 group-hover:opacity-100"
            )}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </Link>
        </div>

        {/* User Section */}
        <div className="border-t border-zinc-800 p-4 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">Perfil</p>
              <p className="text-xs text-zinc-400">Gerir conta</p>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-400">Versão Beta</p>
            <p className="text-xs text-zinc-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
