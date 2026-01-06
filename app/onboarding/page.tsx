"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Gamepad2, CheckCircle2, AlertCircle } from "lucide-react"

/**
 * ONBOARDING OBRIGATÓRIO
 * Força users novos a vincular Steam antes de usar a plataforma
 */

export default function OnboardingPage() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)

  // Redirect if already has Steam linked
  useEffect(() => {
    if (currentUser?.steamId) {
      router.push("/")
    }
  }, [currentUser, router])

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">A carregar...</div>
      </div>
    )
  }

  // If user already has Steam, show success and redirect
  if (currentUser.steamId) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-zinc-900/50 border-zinc-800 p-8 max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Steam Vinculado!</h2>
          <p className="text-zinc-400 mb-4">A redirecionar...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="bg-zinc-900/50 border-zinc-800 p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600">
              <Gamepad2 className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 uppercase">
            Bem-vindo à ProArena
          </h1>
          <p className="text-zinc-400 text-lg">
            Para começar a competir, precisas de vincular a tua conta Steam
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Vincula a tua Steam</h3>
              <p className="text-sm text-zinc-400">
                Usamos a tua conta Steam para verificar horas de jogo, VAC bans e calcular o teu Trust Score
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Requisitos</h3>
              <p className="text-sm text-zinc-400">
                • Conta Steam válida<br />
                • Conta Steam pública<br />
                • Sem VAC bans recentes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-white mb-1">Começa a Jogar</h3>
              <p className="text-sm text-zinc-400">
                Após vincular, terás acesso a matchmaking 1v1 e torneios
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <strong>Importante:</strong> Só podes vincular uma conta Steam por conta ProArena. 
            Certifica-te que é a conta correta antes de continuar.
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => {
            window.location.href = "/api/auth/steam"
          }}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-lg py-6"
        >
          <Gamepad2 className="w-6 h-6 mr-3" />
          VINCULAR CONTA STEAM
        </Button>

        <p className="text-center text-xs text-zinc-500 mt-4">
          Ao vincular, concordas com os nossos Termos de Serviço e Política de Privacidade
        </p>
      </Card>
    </div>
  )
}
