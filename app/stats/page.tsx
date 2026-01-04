"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { useUser } from "@clerk/nextjs"
import { api } from "../../convex/_generated/api"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award } from "lucide-react"

export default function StatsPage() {
  const { user: clerkUser } = useUser()
  const [mode, setMode] = useState<"1v1" | "5v5">("5v5")
  const leaderboard = useQuery(api.users.getLeaderboard, { mode })
  const currentUser = useQuery(api.users.getCurrentUser)

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />
    return null
  }

  const isCurrentUser = (clerkId: string) => {
    return currentUser?.clerkId === clerkId
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto bg-zinc-950">
        <div className="container mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-black uppercase text-zinc-100">Ranking</h1>
            <p className="text-zinc-400">Top 50 jogadores da ProArena</p>
          </div>

          <div className="mb-6 flex gap-3">
            <Button
              variant={mode === "1v1" ? "default" : "outline"}
              onClick={() => setMode("1v1")}
              className={mode === "1v1" ? "" : "border-zinc-800 bg-transparent hover:bg-zinc-900"}
            >
              1v1 Duel
            </Button>
            <Button
              variant={mode === "5v5" ? "default" : "outline"}
              onClick={() => setMode("5v5")}
              className={mode === "5v5" ? "" : "border-zinc-800 bg-transparent hover:bg-zinc-900"}
            >
              5v5 Match
            </Button>
          </div>

          <Card className="border-zinc-800 bg-faceit-panel">
            <CardHeader>
              <CardTitle className="text-zinc-100">Leaderboard - {mode === "1v1" ? "1v1 Duel" : "5v5 Match"}</CardTitle>
              <CardDescription>
                Classificação baseada no ELO {mode === "1v1" ? "1v1" : "5v5"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!leaderboard ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="h-6 flex-1" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-16 text-zinc-400">Rank</TableHead>
                        <TableHead className="text-zinc-400">Jogador</TableHead>
                        <TableHead className="text-right text-zinc-400">ELO 1v1</TableHead>
                        <TableHead className="text-right text-zinc-400">ELO 5v5</TableHead>
                        <TableHead className="text-right text-zinc-400">Steam ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.length === 0 ? (
                        <TableRow className="border-zinc-800">
                          <TableCell colSpan={5} className="text-center text-zinc-400">
                            Nenhum jogador encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        leaderboard.map((player) => (
                          <TableRow
                            key={player.userId}
                            className={`border-zinc-800 ${
                              isCurrentUser(player.clerkId)
                                ? "bg-orange-600/10 hover:bg-orange-600/20"
                                : "hover:bg-zinc-900/50"
                            }`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getRankIcon(player.rank)}
                                <span className={`${
                                  player.rank <= 3 ? "font-bold text-orange-600" : "text-zinc-400"
                                }`}>
                                  #{player.rank}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                                  {player.clerkId.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className={`font-medium ${
                                    isCurrentUser(player.clerkId) ? "text-orange-600" : "text-zinc-100"
                                  }`}>
                                    {isCurrentUser(player.clerkId) ? "Tu" : `Jogador ${player.rank}`}
                                  </div>
                                  {isCurrentUser(player.clerkId) && (
                                    <div className="text-xs text-zinc-500">
                                      {clerkUser?.username || clerkUser?.firstName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${
                                mode === "1v1" ? "text-orange-600" : "text-zinc-400"
                              }`}>
                                {Math.round(player.elo_1v1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-bold ${
                                mode === "5v5" ? "text-orange-600" : "text-zinc-400"
                              }`}>
                                {Math.round(player.elo_5v5)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs text-zinc-500">
                                {player.steamId || "N/A"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {currentUser && leaderboard && (
            <div className="mt-6">
              <Card className="border-zinc-800 bg-zinc-900/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">A tua posição atual</p>
                      <p className="text-2xl font-bold text-orange-600">
                        #{leaderboard.findIndex((p) => p.clerkId === currentUser.clerkId) + 1 || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Teu ELO {mode === "1v1" ? "1v1" : "5v5"}</p>
                      <p className="text-2xl font-bold text-zinc-100">
                        {Math.round(mode === "1v1" ? currentUser.elo_1v1 : currentUser.elo_5v5)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
