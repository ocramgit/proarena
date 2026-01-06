"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, X, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function MatchReadyModal() {
  const router = useRouter()
  const activeMatch = useQuery(api.matches.getMyActiveMatch)
  const confirmMatch = useMutation(api.matchConfirmation.confirmMatch)
  const declineMatch = useMutation(api.matchConfirmation.declineMatch)
  
  const [timer, setTimer] = useState(20)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const showModal = activeMatch && activeMatch.state === "CONFIRMING" && !hasConfirmed

  useEffect(() => {
    if (showModal && activeMatch.confirmationDeadline) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((Number(activeMatch.confirmationDeadline) - Date.now()) / 1000))
        setTimer(remaining)
      }
      
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [showModal, activeMatch?.confirmationDeadline])

  const handleAccept = async () => {
    if (!activeMatch) return
    setIsConfirming(true)
    try {
      const result = await confirmMatch({ matchId: activeMatch._id })
      setHasConfirmed(true)
      
      if (result.allConfirmed) {
        // All players confirmed - redirect to lobby
        setTimeout(() => {
          router.push(`/lobby/${activeMatch._id}`)
        }, 1000)
      }
    } catch (error) {
      console.error("Erro ao confirmar:", error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleDecline = async () => {
    if (!activeMatch) return
    try {
      await declineMatch({ matchId: activeMatch._id })
    } catch (error) {
      console.error("Erro ao recusar:", error)
    }
  }

  if (!showModal) return null

  const progress = (timer / 20) * 100

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="relative w-full max-w-2xl bg-zinc-900 border-2 border-orange-600 shadow-2xl shadow-orange-600/50 p-12">
        {/* Timer Ring */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-zinc-800"
              />
              <circle
                cx="64"
                cy="64"
                r="60"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
                className="text-orange-600 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-black text-white">{timer}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center mt-8">
          <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-tight">
            PARTIDA ENCONTRADA
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Aceita a partida para continuar
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleDecline}
              variant="outline"
              disabled={isConfirming}
              className="flex-1 h-16 text-lg border-red-600 text-red-600 hover:bg-red-600/10"
            >
              <X className="w-5 h-5 mr-2" />
              Recusar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isConfirming}
              className="flex-1 h-16 text-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-xl shadow-green-600/30"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  A confirmar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  ACEITAR
                </>
              )}
            </Button>
          </div>

          {hasConfirmed && (
            <div className="mt-6 text-green-500 font-bold animate-pulse">
              ✅ Confirmado! Aguardando outros jogadores...
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
