"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { LevelBadge20 } from "@/components/LevelBadge20";
import { getProgressToNextLevel, getLevelFromElo } from "@/utils/levels20";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { Trophy, Target, Shield, TrendingUp, TrendingDown, Award, UserPlus, Settings, Crosshair, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { getAverageStatsForLevel } from "@/utils/levels20";

/**
 * FASE 29: PROFILE 3.0 - FACEIT STYLE
 * Página de perfil moderna com suporte a @nickname routing
 */

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = params.username as string;
  
  // Decode %40nickname -> @nickname, then remove @
  const decodedUsername = decodeURIComponent(rawUsername);
  const identifier = decodedUsername.startsWith("@") ? decodedUsername.slice(1) : decodedUsername;

  const currentUser = useQuery(api.users.getCurrentUser);
  
  // Check if identifier looks like a clerkId (starts with "user_")
  const isClerkId = identifier.startsWith("user_");
  
  // Try to get user by clerkId first if it looks like one, otherwise try nickname
  const profileUserByClerkId = useQuery(
    api.users.getUserByClerkId,
    isClerkId ? { clerkId: identifier } : "skip"
  );
  
  const profileUserByNickname = useQuery(
    api.users.getUserByNickname, 
    !isClerkId ? { nickname: identifier } : "skip"
  );
  
  const profileUser = profileUserByClerkId || profileUserByNickname;
  
  // FASE 36: Optimized parallel queries - all fire at once
  // Confirming parallel queries are optimized to run simultaneously
  const eloHistory = useQuery(
    api.stats.getEloHistory,
    profileUser ? { userId: profileUser._id, mode: "1v1" } : "skip"
  );
  
  const mapStats = useQuery(
    api.stats.getMapStats,
    profileUser ? { userId: profileUser._id } : "skip"
  );
  
  const recentMatches = useQuery(
    api.stats.getRecentMatches, 
    profileUser ? { userId: profileUser._id, limit: 5 } : "skip"
  );
  
  const advancedStats = useQuery(
    api.stats.getAdvancedStats, 
    profileUser ? { userId: profileUser._id } : "skip"
  );
  
  const userBadges = useQuery(
    api.badges.getUserBadges,
    profileUser ? { userId: profileUser._id } : "skip"
  );

  // Loading state
  if (profileUser === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">A carregar perfil...</div>
      </div>
    );
  }

  // 404 - User not found
  if (!profileUser) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Jogador não encontrado</h1>
          <p className="text-zinc-400 mb-6">O perfil {identifier.startsWith("@") ? identifier : `@${identifier}`} não existe.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const elo = profileUser.elo_1v1;
  const progress = getProgressToNextLevel(elo);
  const levelData = getLevelFromElo(elo);
  const averageStats = getAverageStatsForLevel(progress.current.level);
  const isOwnProfile = currentUser?._id === profileUser._id;

  // Prepare radar chart data - Top 5 maps performance
  const radarData = mapStats && mapStats.length > 0
    ? mapStats.slice(0, 5).map(map => ({
        stat: map.map,
        player: map.winRate,
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64">
        {/* Hero Section */}
        <div className="relative h-80 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border-b border-zinc-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920')] bg-cover bg-center opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
        
        {/* Content */}
        <div className="container mx-auto px-6 h-full flex items-end pb-8 relative z-10">
          <div className="flex items-end gap-6 w-full">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-4 border-zinc-950 shadow-2xl">
                <span className="text-6xl font-black text-white">
                  {(profileUser.steamName || "?")[0].toUpperCase()}
                </span>
              </div>
              {/* Online Status Ring */}
              <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-950" />
            </div>

            {/* Name & Stats */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Level Badge - Next to name */}
                <LevelBadge20 elo={elo} size="md" showTooltip={true} />
                <h1 className="text-4xl font-black text-white">
                  {profileUser.steamName || "Jogador"}
                </h1>
                {/* FASE 30: Verified Badge */}
                {profileUser.isVerified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-bold text-blue-500">Verificado</span>
                  </div>
                )}
              </div>
              <p className="text-zinc-400 mb-4">@{profileUser.nickname || identifier}</p>
              
              {/* Progress Bar */}
              {progress.next && (
                <div className="max-w-md">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span>Progresso para Nível {progress.next.level}</span>
                    <span>{progress.eloNeeded} ELO restantes</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${progress.progress}%`,
                        background: `linear-gradient(90deg, ${levelData.color}, ${progress.next.color})`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="self-center">
              {isOwnProfile ? (
                <Button onClick={() => router.push("/settings")} className="bg-zinc-800 hover:bg-zinc-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              ) : (
                <Button className="bg-orange-600 hover:bg-orange-500">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Adicionar Amigo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid (Bento Grid) */}
      <div className="container mx-auto px-6 -mt-6 mb-8 relative z-20">
        <div className="grid grid-cols-4 gap-4">
          {/* K/D Ratio */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase">K/D Ratio</span>
            </div>
            <div className="text-3xl font-black text-white">
              {advancedStats?.kd.toFixed(2) || "0.00"}
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase">Win Rate</span>
            </div>
            <div className="text-3xl font-black text-green-500">
              {advancedStats?.winRate.toFixed(0) || "0"}%
            </div>
          </div>

          {/* Headshot % */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase">Headshot %</span>
            </div>
            <div className="text-3xl font-black text-blue-500">
              {advancedStats?.hsPercentage.toFixed(0) || "0"}%
            </div>
          </div>

          {/* Total Matches */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase">Partidas</span>
            </div>
            <div className="text-3xl font-black text-white">
              {advancedStats?.totalMatches || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-6 pb-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="friends">Amigos</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ELO Evolution Graph */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  Evolução de ELO
                </h2>
                {eloHistory && eloHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={eloHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="matchId" tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value) => `#${value.slice(-4)}`} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 12 }} domain={["dataMin - 50", "dataMax + 50"]} />
                      <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }} labelStyle={{ color: "#a1a1aa" }} />
                      <Line type="monotone" dataKey="newElo" stroke="#f97316" strokeWidth={3} dot={{ fill: "#f97316", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-zinc-500">Sem dados suficientes</div>
                )}
              </div>

              {/* Radar Chart - Map Performance */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" />
                  Performance por Mapa
                </h2>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#27272a" />
                      <PolarAngleAxis dataKey="stat" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 10 }} />
                      <Radar name="Win Rate %" dataKey="player" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="circle" formatter={(value) => <span style={{ color: "#a1a1aa" }}>{value}</span>} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-zinc-500">Joga mais partidas em diferentes mapas</div>
                )}
              </div>
            </div>

            {/* Recent Matches */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Últimas Partidas</h2>
              <div className="space-y-2">
                {recentMatches && recentMatches.length > 0 ? (
                  recentMatches.map((match) => (
                    <div key={match.matchId} className={`p-4 rounded-lg border ${match.won ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {match.won ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                          <div>
                            <div className="font-medium text-zinc-100">{match.map}</div>
                            <div className="text-sm text-zinc-400">{match.kills}K / {match.deaths}D / {match.assists}A</div>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${match.eloChange > 0 ? "text-green-500" : "text-red-500"}`}>
                          {match.eloChange > 0 ? "+" : ""}{match.eloChange}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-500 py-8">Sem partidas recentes</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                Badges Desbloqueadas
              </h2>
              {userBadges && userBadges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {userBadges.map((badge) => (
                    <div key={badge._id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center hover:bg-zinc-700/50 transition-colors">
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <div className="font-bold text-sm text-zinc-100">{badge.name}</div>
                      <div className="text-xs text-zinc-400 mt-1">{badge.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-12">Nenhuma badge desbloqueada ainda</div>
              )}
            </div>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="mt-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-zinc-100 mb-4">Amigos</h2>
              <div className="text-center text-zinc-500 py-12">Sistema de amigos em desenvolvimento</div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}
