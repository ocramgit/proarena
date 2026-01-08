"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sidebar } from "@/components/layout/sidebar"
import { RestrictionModal } from "@/components/RestrictionModal"
import { Zap, Lock, Users, Trophy, Target } from "lucide-react"
import { useState, useEffect } from "react"

export function PlayPageClean() {
  const router = useRouter()
  const profile = useQuery(api.users.getCurrentUser)
  const activeMatch = useQuery(api.matches.getMyActiveMatch)
  const queueStatus = useQuery(api.queue.getQueueStatus)

  // Redirect to onboarding if no Steam linked
  useEffect(() => {
    if (profile && !profile.steamId) {
      router.push("/onboarding")
    }
  }, [profile, router])
  
  const joinQueue = useMutation(api.queue.joinQueue)
  const [isJoining, setIsJoining] = useState(false)
  const [restrictionModal, setRestrictionModal] = useState<{
    isOpen: boolean
    type: "steam" | "hours" | "trust" | "banned" | "cooldown"
    details?: any
  }>({
    isOpen: false,
    type: "steam",
  })

  const handleJoin1v1 = async () => {
    // Check Steam linked
    if (!profile?.steamId) {
      setRestrictionModal({
        isOpen: true,
        type: "steam",
      })
      return
    }

    // Check trust score
    const userTrust = profile.trustScore || 1000
    if (userTrust < 800) {
      setRestrictionModal({
        isOpen: true,
        type: "trust",
        details: {
          trustScore: userTrust,
        },
      })
      return
    }

    // Check banned
    if (profile.isBanned) {
      setRestrictionModal({
        isOpen: true,
        type: "banned",
        details: {
          banReason: "Violação dos termos de serviço",
        },
      })
      return
    }

    setIsJoining(true)
    try {
      await joinQueue({ mode: "1v1" })
    } catch (error: any) {
      // Handle cooldown or other errors
      if (error.message?.includes("cooldown")) {
        setRestrictionModal({
          isOpen: true,
          type: "cooldown",
          details: {
            cooldownSeconds: 60,
          },
        })
      } else {
        alert(error.message || "Erro ao entrar na fila")
      }
    } finally {
      setIsJoining(false)
    }
  }

  // Redirect if in active match
  if (activeMatch) {
    if (activeMatch.state === "VETO" || activeMatch.state === "CONFIGURING" || activeMatch.state === "WARMUP") {
      router.push(`/lobby/${activeMatch._id}`)
    } else if (activeMatch.state === "LIVE") {
      router.push(`/match/${activeMatch._id}/live`)
    }
  }

  const isInQueue = queueStatus !== null && queueStatus !== undefined

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      {/* Main Content - NO SCROLL, Centered */}
      <div className="flex-1 flex items-center justify-center p-8 ml-64">
        <div className="flex gap-8 max-w-6xl w-full">
          
          {/* CARD 1: 1v1 DUEL - ACTIVE */}
          <Card className="flex-1 relative h-[600px] overflow-hidden border-2 border-zinc-800 hover:border-orange-600 transition-all duration-300 group cursor-pointer bg-zinc-900">
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity duration-500"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80')",
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/80 to-zinc-900" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-between p-12">
              {/* Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-green-500 uppercase">LIVE</span>
              </div>

              {/* Icon & Title */}
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center shadow-2xl shadow-orange-600/50">
                    <Target className="w-16 h-16 text-white" />
                  </div>
                </div>
                <h2 className="text-6xl font-black text-white mb-4 uppercase tracking-tight">
                  1v1 DUEL
                </h2>
                <p className="text-zinc-400 text-lg mb-2">Duelo Tático Individual</p>
                <div className="flex items-center justify-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Solo
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    Ranked
                  </span>
                  <span>•</span>
                  <span>~5 min</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full">
                {isInQueue ? (
                  <div className="text-center">
                    <div className="text-orange-500 font-bold mb-2 animate-pulse">
                      🔍 A procurar adversário...
                    </div>
                    <Button
                      onClick={() => router.push("/")}
                      variant="outline"
                      className="w-full h-16 text-lg border-red-600 text-red-600 hover:bg-red-600/10"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoin1v1}
                    disabled={isJoining || !profile?.steamId}
                    className="w-full h-20 text-2xl font-black uppercase bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-2xl shadow-orange-600/30 disabled:opacity-70"
                  >
                    {isJoining ? (
                      <>
                        <div className="w-6 h-6 mr-3 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        A ENTRAR...
                      </>
                    ) : !profile?.steamId ? (
                      <>
                        <Lock className="w-6 h-6 mr-3" />
                        Vincula Steam
                      </>
                    ) : (
                      <>
                        <Zap className="w-6 h-6 mr-3" />
                        JOGAR AGORA
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* CARD 2: 5v5 TEAM - LOCKED */}
          <Card className="flex-1 relative h-[600px] overflow-hidden border-2 border-zinc-800 bg-zinc-900 opacity-60 cursor-not-allowed">
            {/* Background Image - Greyscale */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-10 grayscale"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80')",
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/90 to-zinc-900" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-between p-12">
              {/* Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-full">
                <span className="text-sm font-bold text-zinc-500 uppercase">Em Breve</span>
              </div>

              {/* Icon & Title */}
              <div className="text-center">
                <div className="mb-6 flex justify-center">
                  <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center">
                    <Lock className="w-16 h-16 text-zinc-600" />
                  </div>
                </div>
                <h2 className="text-6xl font-black text-zinc-600 mb-4 uppercase tracking-tight">
                  5v5 TEAM
                </h2>
                <p className="text-zinc-600 text-lg mb-2">Competitivo em Equipa</p>
                <div className="flex items-center justify-center gap-4 text-sm text-zinc-700">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    5 vs 5
                  </span>
                  <span>•</span>
                  <span>~45 min</span>
                </div>
              </div>

              {/* Locked Message */}
              <div className="w-full text-center">
                <div className="text-zinc-600 font-bold mb-4">
                  🔒 Modo bloqueado
                </div>
                <p className="text-sm text-zinc-700">
                  Disponível em breve para equipas registadas
                </p>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Restriction Modal */}
      <RestrictionModal
        isOpen={restrictionModal.isOpen}
        onClose={() => setRestrictionModal({ ...restrictionModal, isOpen: false })}
        type={restrictionModal.type}
        details={restrictionModal.details}
      />
    </div>
  )
}
