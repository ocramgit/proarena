"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Trophy, BarChart3, User, Shield, MessageSquare } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

const getNavItems = (currentUser: any) => [
  {
    name: "Jogar",
    href: "/",
    icon: Gamepad2,
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
    name: "Ranking",
    href: "/stats",
    icon: BarChart3,
  },
  {
    name: "Torneios",
    href: "/tournaments",
    icon: Trophy,
  },
  {
    name: "Suporte",
    href: "/support",
    icon: MessageSquare,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useQuery(api.admin.isAdmin)
  const staffRole = useQuery(api.staff.getMyStaffRole)
  const currentUser = useQuery(api.users.getCurrentUser)

  const navItems = getNavItems(currentUser)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-full flex-col">
        {/* Navigation - starts from top, no logo */}
        <nav className="flex-1 space-y-1 p-4 pt-20">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-l-4 border-orange-600 bg-zinc-900/50 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-100"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
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
