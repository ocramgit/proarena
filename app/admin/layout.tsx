"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Loader2, Shield } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * FASE 35: ADMIN LAYOUT WITH RBAC
 * Protects admin routes based on staff role
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const staffRole = useQuery(api.staff.getMyStaffRole)

  useEffect(() => {
    if (staffRole === undefined) return

    // Not staff at all - kick to home
    if (!staffRole) {
      router.push("/")
      return
    }

    // FASE 37: Support role - only allow /admin/tickets
    if (staffRole === "SUPPORT") {
      const allowedPaths = ["/admin/tickets"]
      const isAllowed = allowedPaths.some(path => pathname?.startsWith(path))
      
      if (!isAllowed) {
        router.push("/admin/tickets")
      }
    }
  }, [staffRole, pathname, router])

  // Loading state
  if (staffRole === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    )
  }

  // Not authorized
  if (!staffRole) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-zinc-900/50 border-zinc-800 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Acesso Negado</h2>
          <p className="text-zinc-400 mb-6">
            Não tens permissões para aceder ao painel de administração
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Voltar ao Início
          </Button>
        </Card>
      </div>
    )
  }

  // Support trying to access non-tickets pages
  if (staffRole === "SUPPORT" && !pathname?.startsWith("/admin/tickets")) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-zinc-900/50 border-zinc-800 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Acesso Restrito</h2>
          <p className="text-zinc-400 mb-6">
            Como membro do Suporte, só tens acesso à área de tickets
          </p>
          <Button 
            onClick={() => router.push("/admin/tickets")} 
            className="bg-blue-600 hover:bg-blue-500"
          >
            Ir para Tickets
          </Button>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
