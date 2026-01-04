"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "../../convex/_generated/api"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Trophy, Target, TrendingUp, AlertCircle, Clock, MapPin, ChevronRight } from "lucide-react"

export default function ProfilePage() {
  const { user: clerkUser } = useUser()
  const profile = useQuery(api.users.getMyProfile)
  const matchHistory = useQuery(api.matches.getMyMatchHistory)
  const updateSteamId = useMutation(api.users.updateSteamId)
  const [steamId, setSteamId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdateSteamId = async () => {
    if (!steamId.trim()) return
    setIsUpdating(true)
    try {
      await updateSteamId({ steamId: steamId.trim() })
      setSteamId("")
    } catch (error) {
      console.error("Error updating Steam ID:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const elo1v1Progress = profile ? (profile.elo_1v1 / 3000) * 100 : 0
  const elo5v5Progress = profile ? (profile.elo_5v5 / 3000) * 100 : 0

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto bg-zinc-950">
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-orange-900/20 via-zinc-900 to-zinc-950">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920')] bg-cover bg-center opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="container relative -mt-32 mx-auto max-w-6xl px-6 pb-12">
          <div className="mb-8 flex items-end gap-6">
            <div className="relative">
              {clerkUser?.imageUrl ? (
                <img
                  src={clerkUser.imageUrl}
                  alt="Avatar"
                  className="h-32 w-32 rounded-xl border-4 border-zinc-900 bg-zinc-900 shadow-2xl"
                />
              ) : (
                <Skeleton className="h-32 w-32 rounded-xl" />
              )}
              <div className="absolute -bottom-2 -right-2 rounded-lg bg-orange-600 px-3 py-1">
                <Trophy className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1 pb-2">
              <h1 className="mb-2 text-4xl font-black uppercase text-zinc-100">
                {clerkUser?.username || clerkUser?.firstName || "Jogador"}
              </h1>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Membro desde {new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          </div>

          {profile && !profile.steamId && (
            <Card className="mb-8 border-yellow-600/50 bg-yellow-600/10">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                  <div className="flex-1">
                    <CardTitle className="text-yellow-600">Steam ID Necessária</CardTitle>
                    <CardDescription className="text-yellow-600/80">
                      Precisas de adicionar a tua Steam ID para poderes jogar partidas competitivas.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="Ex: STEAM_0:1:12345678"
                    value={steamId}
                    onChange={(e) => setSteamId(e.target.value)}
                    className="border-yellow-600/30 bg-zinc-900/50"
                  />
                  <Button
                    onClick={handleUpdateSteamId}
                    disabled={isUpdating || !steamId.trim()}
                    className="bg-yellow-600 hover:bg-yellow-500"
                  >
                    {isUpdating ? "A guardar..." : "Guardar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-zinc-100">Rating ELO</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-zinc-100">1v1 Duel</CardTitle>
                    <Target className="h-6 w-6 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <>
                      <div className="mb-4 text-5xl font-black text-orange-600">
                        {Math.round(profile.elo_1v1)}
                      </div>
                      <Progress value={elo1v1Progress} className="mb-2" />
                      <p className="text-xs text-zinc-400">
                        {Math.round(elo1v1Progress)}% até ao próximo nível
                      </p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="mb-4 h-16 w-32" />
                      <Skeleton className="mb-2 h-2 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-zinc-100">5v5 Match</CardTitle>
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <>
                      <div className="mb-4 text-5xl font-black text-orange-600">
                        {Math.round(profile.elo_5v5)}
                      </div>
                      <Progress value={elo5v5Progress} className="mb-2" />
                      <p className="text-xs text-zinc-400">
                        {Math.round(elo5v5Progress)}% até ao próximo nível
                      </p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="mb-4 h-16 w-32" />
                      <Skeleton className="mb-2 h-2 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-bold text-zinc-100">Estatísticas</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-400">Partidas</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <div className="text-3xl font-bold text-zinc-100">
                      {profile.stats.totalMatches}
                    </div>
                  ) : (
                    <Skeleton className="h-9 w-16" />
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-400">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <div className="text-3xl font-bold text-orange-600">
                      {profile.stats.winRate.toFixed(0)}%
                    </div>
                  ) : (
                    <Skeleton className="h-9 w-16" />
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-400">Vitórias</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <div className="text-3xl font-bold text-green-600">
                      {profile.stats.wins}
                    </div>
                  ) : (
                    <Skeleton className="h-9 w-16" />
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-faceit-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-400">Derrotas</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <div className="text-3xl font-bold text-red-600">
                      {profile.stats.losses}
                    </div>
                  ) : (
                    <Skeleton className="h-9 w-16" />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Match History Table */}
          <div>
            <h2 className="mb-4 text-2xl font-bold text-zinc-100">Histórico de Partidas</h2>
            <Card className="border-zinc-800 bg-faceit-panel">
              <CardContent className="p-0">
                {!matchHistory ? (
                  <div className="p-8">
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full mb-2" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : matchHistory.length === 0 ? (
                  <div className="p-12 text-center">
                    <Trophy className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400">Ainda não jogaste nenhuma partida</p>
                    <p className="text-sm text-zinc-500 mt-2">Entra na fila para começar!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-zinc-800">
                        <tr className="text-left text-xs font-bold text-zinc-400 uppercase">
                          <th className="p-4">Resultado</th>
                          <th className="p-4">Mapa</th>
                          <th className="p-4">Score</th>
                          <th className="p-4">K/D</th>
                          <th className="p-4">Data</th>
                          <th className="p-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.map((match: any) => {
                          const isWin = match.result === "WIN"
                          const kdRatio = match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills.toFixed(2)
                          
                          return (
                            <tr 
                              key={match._id}
                              className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                              onClick={() => window.location.href = `/match/${match._id}`}
                            >
                              <td className="p-4">
                                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                                  isWin 
                                    ? "bg-green-600/20 text-green-600 border border-green-600/50" 
                                    : "bg-red-600/20 text-red-600 border border-red-600/50"
                                }`}>
                                  {isWin ? "VITÓRIA" : "DERROTA"}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-zinc-500" />
                                  <span className="font-bold text-zinc-100 uppercase">
                                    {match.map?.replace("de_", "") || "N/A"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="font-mono font-bold text-zinc-100">
                                  {match.scoreTeamA} - {match.scoreTeamB}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-zinc-100">{kdRatio}</span>
                                  <span className="text-xs text-zinc-500">
                                    ({match.kills}/{match.deaths})
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                  <Clock className="h-4 w-4" />
                                  {new Date(match.finishedAt).toLocaleDateString("pt-PT", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </div>
                              </td>
                              <td className="p-4">
                                <ChevronRight className="h-5 w-5 text-zinc-600" />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
