"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, User, Loader2, X } from "lucide-react"
import { Sidebar } from "@/components/layout/sidebar"
// PHASE 13: Social features disabled for 1v1 MVP
// import { SocialSidebar } from "@/components/social-sidebar"
// import { ChatPanel } from "@/components/chat-panel"
import { toast } from "sonner"

type GameMode = "1v1" | "5v5" | null

export function Dashboard() {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<GameMode>(null)
  const [waitTime, setWaitTime] = useState(0)
  
  const profile = useQuery(api.users.getMyProfile)
  const activeMatch = useQuery(api.matches.getMyActiveMatch)
  const queueStatus = useQuery(api.queue.getQueueStatus)
  const queueCount1v1 = useQuery(api.queue.getQueueCount, { mode: "1v1" })
  const queueCount5v5 = useQuery(api.queue.getQueueCount, { mode: "5v5" })
  
  const joinQueue = useMutation(api.queue.joinQueue)
  const leaveQueue = useMutation(api.queue.leaveQueue)
  const seedQueue = useMutation(api.dev.seedQueue)
  const seed1v1Queue = useMutation(api.dev.seed1v1Queue)
  
  const isInQueue = !!queueStatus
  const queueMode = queueStatus?.mode
  
  // Show notification if player has active match, but don't force redirect
  // This allows players to navigate freely while match is ongoing
  useEffect(() => {
    if (activeMatch && activeMatch.state !== "FINISHED") {
      // Only show toast notification, don't force redirect
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
  }, [activeMatch?._id]) // Only trigger when match ID changes, not on every render
  
  useEffect(() => {
    if (queueStatus) {
      const interval = setInterval(() => {
        setWaitTime(Math.floor((Date.now() - Number(queueStatus.joinedAt)) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [queueStatus])
  
  const handleJoinQueue = async () => {
    if (!selectedMode) return
    
    try {
      await joinQueue({ mode: selectedMode })
    } catch (error: any) {
      toast.error(error.message || "Erro ao entrar na fila")
    }
  }
  
  const handleLeaveQueue = async () => {
    try {
      await leaveQueue()
      setWaitTime(0)
    } catch (error: any) {
      toast.error(error.message || "Erro ao sair da fila")
    }
  }
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const handleSeedQueue = async () => {
    try {
      await seedQueue({ count: 9, mode: "5v5" })
      toast.success("Fila preenchida com 9 jogadores fake!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSeed1v1Queue = async () => {
    try {
      await seed1v1Queue({})
      toast.success("Bot adicionado à fila 1v1!")
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* PHASE 13: Social features disabled */}
      {/* <SocialSidebar /> */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button
          onClick={handleSeedQueue}
          variant="outline"
          size="sm"
          className="border-orange-600 bg-orange-600/10 text-orange-600 hover:bg-orange-600/20"
        >
          DEV: Encher Fila (9x 5v5)
        </Button>
        <Button
          onClick={handleSeed1v1Queue}
          variant="outline"
          size="sm"
          className="border-blue-600 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20"
        >
          DEV: Encher Fila (1x 1v1)
        </Button>
      </div>
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="min-h-screen">
          <div className="relative h-[400px] overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920')] bg-cover bg-center opacity-20" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <div className="relative z-10 flex h-full items-center justify-center">
              <div className="text-center">
                <h1 className="mb-4 text-6xl font-black uppercase tracking-tight text-zinc-100">
                  Jogar CS2
                </h1>
                <p className="text-lg text-zinc-400">
                  Escolhe o teu modo de jogo e entra na competição
                </p>
              </div>
            </div>
          </div>

          <div className="container mx-auto max-w-6xl px-6 py-12">
            <div className="mb-8">
              <h2 className="mb-2 text-2xl font-bold text-zinc-100">Seleciona o Modo</h2>
              <p className="text-zinc-400">Escolhe entre duelo 1v1 ou partida completa 5v5</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMode === "1v1"
                    ? "ring-2 ring-orange-600 ring-offset-2 ring-offset-zinc-950"
                    : ""
                }`}
                onClick={() => setSelectedMode("1v1")}
              >
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-600/10">
                      <User className="h-8 w-8 text-orange-600" />
                    </div>
                    {selectedMode === "1v1" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-3xl font-black uppercase">1v1 Duel</CardTitle>
                  <CardDescription className="text-base">
                    Duelo individual contra um adversário
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-3">
                      <span className="text-sm text-zinc-400">Teu ELO</span>
                      <span className="text-lg font-bold text-orange-600">{profile?.elo_1v1 || 1000}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedMode === "5v5"
                    ? "ring-2 ring-orange-600 ring-offset-2 ring-offset-zinc-950"
                    : ""
                }`}
                onClick={() => setSelectedMode("5v5")}
              >
                <CardHeader>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-600/10">
                      <Users className="h-8 w-8 text-orange-600" />
                    </div>
                    {selectedMode === "5v5" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-3xl font-black uppercase">5v5 Match</CardTitle>
                  <CardDescription className="text-base">
                    Partida competitiva completa em equipa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-3">
                      <span className="text-sm text-zinc-400">Teu ELO</span>
                      <span className="text-lg font-bold text-orange-600">1000</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-3">
                      <span className="text-sm text-zinc-400">Partidas</span>
                      <span className="text-lg font-bold text-zinc-100">0</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-zinc-900/50 p-3">
                      <span className="text-sm text-zinc-400">Win Rate</span>
                      <span className="text-lg font-bold text-zinc-100">0%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 flex justify-center">
              {activeMatch ? (
                <Button
                  size="lg"
                  onClick={() => {
                    if (activeMatch.state === "LIVE") {
                      router.push(`/match/${activeMatch._id}/live`);
                    } else {
                      router.push(`/lobby/${activeMatch._id}`);
                    }
                  }}
                  className="h-16 px-16 text-xl font-black uppercase tracking-wide bg-green-600 hover:bg-green-500"
                >
                  VOLTAR À PARTIDA
                </Button>
              ) : isInQueue ? (
                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    onClick={handleLeaveQueue}
                    variant="outline"
                    className="h-16 px-16 text-xl font-black uppercase tracking-wide border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  >
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    A Procurar... {formatTime(waitTime)}
                    <X className="ml-3 h-6 w-6" />
                  </Button>
                  <p className="text-sm text-zinc-400">Modo: {queueMode?.toUpperCase()} • Clica para cancelar</p>
                </div>
              ) : (
                <Button
                  size="lg"
                  disabled={!selectedMode}
                  onClick={handleJoinQueue}
                  className="h-16 px-16 text-xl font-black uppercase tracking-wide"
                >
                  {selectedMode ? `Jogar ${selectedMode}` : "Seleciona um modo"}
                </Button>
              )}
            </div>

            {selectedMode && (
              <div className="mt-8 rounded-lg border border-zinc-800 bg-faceit-panel p-6">
                <h3 className="mb-4 text-lg font-bold text-zinc-100">Informação da Fila</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-zinc-900/50 p-4">
                    <p className="text-sm text-zinc-400">Jogadores na Fila</p>
                    {selectedMode === "1v1" ? (
                      <p className="mt-1 text-2xl font-bold text-orange-600">{queueCount1v1 ?? 0}</p>
                    ) : (
                      <p className="mt-1 text-2xl font-bold text-orange-600">{queueCount5v5 ?? 0}</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-zinc-900/50 p-4">
                    <p className="text-sm text-zinc-400">Tempo Médio de Espera</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-100">~2min</p>
                  </div>
                  <div className="rounded-lg bg-zinc-900/50 p-4">
                    <p className="text-sm text-zinc-400">Partidas Ativas</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-100">0</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* PHASE 13: Chat disabled for 1v1 MVP */}
      {/* <ChatPanel channelId="global" title="Chat Global" /> */}
    </div>
  )
}
