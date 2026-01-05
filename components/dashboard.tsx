"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, User, Loader2, X, Zap, Trophy, Target, 
  Clock, CheckCircle2, XCircle, Flame, Shield,
  TrendingUp, Award, Lock
} from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
import { toast } from "sonner"

type GameMode = "1v1" | "5v5" | null

export function Dashboard() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<GameMode>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [confirmationTimer, setConfirmationTimer] = useState(20)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  
  const profile = useQuery(api.users.getMyProfile)
  const activeMatch = useQuery(api.matches.getMyActiveMatch)
  const queueStatus = useQuery(api.queue.getQueueStatus)
  const queueCount1v1 = useQuery(api.queue.getQueueCount, { mode: "1v1" })
  const queueCount5v5 = useQuery(api.queue.getQueueCount, { mode: "5v5" })
  
  const joinQueue = useMutation(api.queue.joinQueue)
  const leaveQueue = useMutation(api.queue.leaveQueue)
  
  const isInQueue = !!queueStatus
  const queueMode = queueStatus?.mode
  
  // Show notification if player has active match
  useEffect(() => {
    if (activeMatch && activeMatch.state !== "FINISHED") {
      const matchStateText = activeMatch.state === "LIVE" ? "ao vivo" : 
                            activeMatch.state === "WARMUP" ? "em aquecimento" : 
                            activeMatch.state === "VETO" ? "em veto" : "ativa";
      
      toast.info(`Tens uma partida ${matchStateText}`, {
        action: {
          label: "Ver Partida",
          onClick: () => router.push(`/lobby/${activeMatch._id}`)
        },
        duration: 5000,
      });
    }
  }, [activeMatch?._id])
  
  // Queue wait time counter
  useEffect(() => {
    if (queueStatus) {
      const interval = setInterval(() => {
        setWaitTime(Math.floor((Date.now() - Number(queueStatus.joinedAt)) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [queueStatus])

  // Confirmation timer (simulated - in real app this would come from backend)
  useEffect(() => {
    if (activeMatch && activeMatch.state === "VETO" && !hasConfirmed) {
      const timer = setInterval(() => {
        setConfirmationTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            // In real app: auto-leave queue if not confirmed
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [activeMatch?.state, hasConfirmed])
  
  const handleJoinQueue = async () => {
    if (!selectedMode) return
    
    // Check if Steam is linked
    if (!profile?.steamId) {
      toast.error("Vincula a tua conta Steam primeiro!", {
        action: {
          label: "Ir para Perfil",
          onClick: () => router.push("/profile")
        }
      })
      return
    }
    
    try {
      await joinQueue({ mode: selectedMode })
      toast.success("Entraste na fila!")
    } catch (error: any) {
      toast.error(error.message || "Erro ao entrar na fila")
    }
  }
  
  const handleLeaveQueue = async () => {
    try {
      await leaveQueue()
      setWaitTime(0)
      toast.info("Saíste da fila")
    } catch (error: any) {
      toast.error(error.message || "Erro ao sair da fila")
    }
  }

  const handleConfirmMatch = () => {
    setHasConfirmed(true)
    toast.success("Partida confirmada! ✅")
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show confirmation modal if match found
  const showConfirmation = activeMatch && activeMatch.state === "VETO" && !hasConfirmed

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="ml-64 flex-1 bg-zinc-950">
        
        {/* Hero Section */}
        <div className="relative h-80 overflow-hidden bg-gradient-to-br from-orange-900/20 via-zinc-900 to-zinc-950">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920')] bg-cover bg-center opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
          
          <div className="relative container mx-auto h-full flex flex-col justify-center px-8">
            <div className="max-w-3xl">
              <h1 className="text-6xl font-black uppercase text-zinc-100 mb-4 tracking-tight">
                Pronto para Competir?
              </h1>
              <p className="text-xl text-zinc-400 mb-6">
                Escolhe o teu modo de jogo e entra na fila para encontrar adversários
              </p>
              
              {/* Player Stats Quick View */}
              {profile && (
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-500" />
                    <span className="text-zinc-400">ELO:</span>
                    <span className="font-bold text-orange-500">{Math.round(profile.elo_1v1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <span className="text-zinc-400">Win Rate:</span>
                    <span className="font-bold text-green-500">{profile.stats?.winRate?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" />
                    <span className="text-zinc-400">Partidas:</span>
                    <span className="font-bold text-zinc-100">{profile.stats?.totalMatches || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-8 py-12">
          
          {/* Active Match Alert */}
          {activeMatch && activeMatch.state !== "FINISHED" && (
            <Card className="mb-8 border-green-600/50 bg-gradient-to-r from-green-600/10 to-emerald-600/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-green-500 uppercase">Partida Ativa</h3>
                    <p className="text-sm text-zinc-400">
                      {activeMatch.state === "VETO" ? "Fase de veto em progresso" : 
                       activeMatch.state === "WARMUP" ? "Servidor pronto - Aquecimento" :
                       activeMatch.state === "LIVE" ? "Partida ao vivo" : "Partida em progresso"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (activeMatch.state === "LIVE") {
                      router.push(`/match/${activeMatch._id}/live`);
                    } else {
                      router.push(`/lobby/${activeMatch._id}`);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold uppercase"
                  size="lg"
                >
                  {activeMatch.state === "LIVE" ? "Ver Jogo" : "Ir para Lobby"}
                </Button>
              </div>
            </Card>
          )}

          {/* Queue Status */}
          {isInQueue && (
            <Card className="mb-8 border-orange-600/50 bg-gradient-to-r from-orange-600/10 to-orange-500/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                  <div>
                    <h3 className="text-lg font-black text-orange-500 uppercase">A Procurar Partida</h3>
                    <p className="text-sm text-zinc-400">
                      Modo: <span className="font-bold text-zinc-100">{queueMode?.toUpperCase()}</span> • 
                      Tempo: <span className="font-bold text-orange-500">{formatTime(waitTime)}</span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleLeaveQueue}
                  variant="destructive"
                  className="font-bold uppercase"
                  size="lg"
                >
                  <X className="w-5 h-5 mr-2" />
                  Sair da Fila
                </Button>
              </div>
            </Card>
          )}

          {/* Mode Selection */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-zinc-100 mb-6 uppercase">Escolhe o Modo de Jogo</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* 1v1 Mode */}
              <Card 
                className={`group relative overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  selectedMode === "1v1" 
                    ? "border-orange-600 bg-orange-600/10 scale-105 shadow-2xl shadow-orange-600/20" 
                    : "border-zinc-800 bg-zinc-900/50 hover:border-orange-600/50 hover:scale-102"
                }`}
                onClick={() => !isInQueue && setSelectedMode("1v1")}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    {selectedMode === "1v1" && (
                      <CheckCircle2 className="w-8 h-8 text-orange-500" />
                    )}
                  </div>
                  
                  <h3 className="text-3xl font-black text-zinc-100 mb-2 uppercase">1v1 Duel</h3>
                  <p className="text-zinc-400 mb-6">
                    Enfrenta um adversário em mapas de aim. Rápido, intenso e competitivo.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span>Duração: ~10 minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span>MR15 (Primeiro a 16)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span>Na fila: {queueCount1v1 || 0} jogadores</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="px-3 py-1 rounded-full bg-orange-600/20 text-orange-500 font-bold uppercase text-xs">
                      Disponível
                    </div>
                  </div>
                </div>
              </Card>

              {/* 5v5 Mode - Coming Soon */}
              <Card className="group relative overflow-hidden border-2 border-zinc-800 bg-zinc-900/30 opacity-60 cursor-not-allowed">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/10 to-transparent" />
                
                <div className="relative p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                      <Users className="w-8 h-8 text-zinc-600" />
                    </div>
                    <Lock className="w-6 h-6 text-zinc-600" />
                  </div>
                  
                  <h3 className="text-3xl font-black text-zinc-500 mb-2 uppercase">5v5 Match</h3>
                  <p className="text-zinc-600 mb-6">
                    Partidas competitivas 5v5 em mapas clássicos do CS2.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Clock className="w-4 h-4" />
                      <span>Duração: ~45 minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Target className="w-4 h-4" />
                      <span>MR12 (Primeiro a 13)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                      <Users className="w-4 h-4" />
                      <span>10 jogadores necessários</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <div className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 font-bold uppercase text-xs">
                      Em Breve
                    </div>
                  </div>
                </div>
              </Card>

            </div>
          </div>

          {/* Action Button */}
          {!isInQueue && !activeMatch && (
            <div className="flex justify-center">
              <Button
                onClick={handleJoinQueue}
                disabled={!selectedMode || !profile?.steamId}
                className="h-20 px-16 text-2xl font-black uppercase tracking-wide bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20"
              >
                {!profile?.steamId ? (
                  <>
                    <Lock className="w-6 h-6 mr-3" />
                    Vincula Steam Primeiro
                  </>
                ) : !selectedMode ? (
                  "Escolhe um Modo"
                ) : (
                  <>
                    <Zap className="w-6 h-6 mr-3" />
                    Entrar na Fila
                  </>
                )}
              </Button>
            </div>
          )}

        </div>
      </main>

      {/* FACEIT-Style Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-2 border-orange-600 bg-zinc-900 shadow-2xl shadow-orange-600/20">
            <div className="p-8 text-center">
              
              {/* Timer Circle */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-zinc-800"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 58}`}
                    strokeDashoffset={`${2 * Math.PI * 58 * (1 - confirmationTimer / 20)}`}
                    className="text-orange-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-5xl font-black text-orange-500">{confirmationTimer}</div>
                </div>
              </div>

              <h2 className="text-4xl font-black text-zinc-100 uppercase mb-4">
                Partida Encontrada!
              </h2>
              <p className="text-xl text-zinc-400 mb-8">
                Confirma a tua presença em <span className="text-orange-500 font-bold">{confirmationTimer} segundos</span>
              </p>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleConfirmMatch}
                  className="h-16 px-12 text-xl font-black uppercase bg-green-600 hover:bg-green-500"
                >
                  <CheckCircle2 className="w-6 h-6 mr-3" />
                  Confirmar
                </Button>
                <Button
                  onClick={handleLeaveQueue}
                  variant="destructive"
                  className="h-16 px-12 text-xl font-black uppercase"
                >
                  <XCircle className="w-6 h-6 mr-3" />
                  Recusar
                </Button>
              </div>

              <p className="text-sm text-zinc-500 mt-6">
                Se não confirmares, serás removido da fila automaticamente
              </p>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
