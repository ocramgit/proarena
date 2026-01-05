"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gamepad2, Trophy, BarChart3, User, Shield } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

const navItems = [
  {
    name: "Jogar",
    href: "/",
    icon: Gamepad2,
  },
  {
    name: "Perfil",
    href: "/profile",
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
]

export function Sidebar() {
  const pathname = usePathname()
  const isAdmin = useQuery(api.admin.isAdmin)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-zinc-800 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
              <Gamepad2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-tight text-zinc-100">
              ProArena
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
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
          
          {/* Admin Link - Only visible to admins */}
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "border-l-4 border-red-600 bg-red-900/20 text-red-500"
                  : "text-red-400 hover:bg-red-900/10 hover:text-red-300"
              )}
            >
              <Shield className="h-5 w-5" />
              <span className="font-black">ADMIN</span>
            </Link>
          )}
        </nav>

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
