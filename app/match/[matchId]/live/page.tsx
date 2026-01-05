"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Target, Skull, Award, Loader2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

// PHASE 12 VERSUS: Live match with same layout as lobby - players on sides, scoreboard in center
export default function LiveMatchPageVersus() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  // Use liveMatch query that includes real-time player stats
  const match = useQuery(api.liveMatch.getLiveMatchData, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const fetchDatHostData = useAction(api.dathostLiveData.fetchDatHostMatchData);

  const [showVictory, setShowVictory] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [liveScores, setLiveScores] = useState<{ team1: number; team2: number } | null>(null);
  const [liveStats, setLiveStats] = useState<any>(null);

  // Poll DatHost API every 5 seconds while match is LIVE
  useEffect(() => {
    if (!match || match.state !== "LIVE" || !match.dathostMatchId) {
      console.log("⚠️ Polling not starting - match:", !!match, "state:", match?.state, "dathostMatchId:", !!match?.dathostMatchId);
      return;
    }

    console.log("🔄 Starting DatHost API polling (every 5s)", "dathostMatchId:", match.dathostMatchId);
    
    const pollDatHost = async () => {
      try {
        const data = await fetchDatHostData({ dathostMatchId: match.dathostMatchId! });
        
        console.log("🔄 DatHost data received:", {
          team1Score: data.team1.score,
          team2Score: data.team2.score,
          team1Players: data.team1.players,
          team2Players: data.team2.players,
        });
        
        setLiveScores({ team1: data.team1.score, team2: data.team2.score });
        setLiveStats(data);
        
        // Check if match finished and redirect
        if (data.finished) {
          console.log("🏁 Match finished according to DatHost - redirecting to results");
          router.push(`/matches/${matchId}/result`);
        }
      } catch (error) {
        console.error("Error polling DatHost:", error);
      }
    };

    // Poll immediately
    pollDatHost();
    
    // Then poll every 5 seconds
    const interval = setInterval(pollDatHost, 5000);

    return () => {
      console.log("⏹️ Stopping DatHost API polling");
      clearInterval(interval);
    };
  }, [match?.state, match?.dathostMatchId, fetchDatHostData]);

  // Check if match finished and show victory/defeat animation
  useEffect(() => {
    if (match?.state === "FINISHED" && currentUser && !showVictory) {
      const playerA = match.teamAPlayers?.[0];
      const playerB = match.teamBPlayers?.[0];
      const currentUserId = currentUser._id;
      
      const isPlayerA = currentUserId === playerA?._id;
      const isPlayerB = currentUserId === playerB?._id;
      const scoreA = match.scoreTeamA || 0;
      const scoreB = match.scoreTeamB || 0;
      
      // Determine winner based on scores
      const winner = scoreA > scoreB ? "A" : "B";
      // User won if they're on the winning team
      const userWon = (isPlayerA && winner === "A") || (isPlayerB && winner === "B");
      
      console.log("🏁 Match finished - isPlayerA:", isPlayerA, "isPlayerB:", isPlayerB, "winner:", winner, "userWon:", userWon);
      
      setIsWinner(userWon);
      setShowVictory(true);
    }
  }, [match?.state, match?.scoreTeamA, match?.scoreTeamB, match?.teamAPlayers, match?.teamBPlayers, currentUser, showVictory]);

  if (!match || !currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  const playerA = match.teamAPlayers?.[0];
  const playerB = match.teamBPlayers?.[0];
  
  // Use live scores from DatHost if available, otherwise fall back to DB
  const scoreA = liveScores?.team1 ?? match.scoreTeamA ?? 0;
  const scoreB = liveScores?.team2 ?? match.scoreTeamB ?? 0;
  
  const currentUserId = currentUser._id;
  const isPlayerA = currentUserId === playerA?._id;
  const isPlayerB = currentUserId === playerB?._id;

  // Get player stats from DatHost if available, otherwise from DB (for real-time updates)
  const statsA = liveStats?.team1?.players?.[0] || playerA?.stats || { kills: 0, deaths: 0, assists: 0, mvps: 0 };
  const statsB = liveStats?.team2?.players?.[0] || playerB?.stats || { kills: 0, deaths: 0, assists: 0, mvps: 0 };
  
  console.log("📊 Current display values:", {
    scoreA,
    scoreB,
    statsA,
    statsB,
    hasLiveStats: !!liveStats,
    hasLiveScores: !!liveScores,
  });

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 flex">
      
      {/* Victory/Defeat Overlay */}
      {showVictory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="text-center space-y-8">
            {isWinner ? (
              <>
                <Trophy className="w-32 h-32 text-yellow-500 mx-auto animate-bounce" />
                <h1 className="text-7xl font-black text-yellow-500 uppercase tracking-wider animate-pulse">
                  VITÓRIA!
                </h1>
                <p className="text-2xl text-zinc-400">
                  +25 ELO
                </p>
              </>
            ) : (
              <>
                <Skull className="w-32 h-32 text-red-500 mx-auto" />
                <h1 className="text-7xl font-black text-red-500 uppercase tracking-wider">
                  DERROTA
                </h1>
                <p className="text-2xl text-zinc-400">
                  -25 ELO
                </p>
              </>
            )}
            
            <div className="flex gap-4 justify-center mt-12">
              <Button
                onClick={() => router.push("/")}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase px-8 py-6 text-lg"
              >
                Jogar Novamente
              </Button>
              <Button
                onClick={() => router.push(`/matches/${matchId}`)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold uppercase px-8 py-6 text-lg"
              >
                Ver Detalhes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT PANEL - PLAYER A */}
      <div className={`w-[250px] border-r-4 ${isPlayerA ? 'border-orange-500' : 'border-zinc-800'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <LivePlayerPanel 
          player={playerA} 
          isCurrentUser={isPlayerA}
          side="A"
          stats={statsA}
        />
      </div>

      {/* CENTER - SCOREBOARD */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-zinc-500 mb-1">
              {match.state === "LIVE" ? "🔴 AO VIVO" : match.state === "WARMUP" ? "⏱️ AQUECIMENTO" : "✅ TERMINADO"}
            </div>
            <div className="text-lg font-bold text-zinc-100">
              {match.selectedMap?.replace(/_/g, " ").toUpperCase()} • {match.selectedLocation}
            </div>
          </div>
        </div>

        {/* Scoreboard Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl space-y-8">
            
            {/* Main Score Display */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-8">
              <div className="flex items-center justify-center gap-12">
                
                {/* Team A Score */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    {playerA?.displayName || "Jogador A"}
                  </div>
                  <div className={`text-8xl font-black ${scoreA > scoreB ? "text-green-500" : "text-zinc-400"}`}>
                    {scoreA}
                  </div>
                </div>

                {/* VS Separator */}
                <div className="text-4xl font-black text-zinc-600">VS</div>

                {/* Team B Score */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    {playerB?.displayName || "Jogador B"}
                  </div>
                  <div className={`text-8xl font-black ${scoreB > scoreA ? "text-green-500" : "text-zinc-400"}`}>
                    {scoreB}
                  </div>
                </div>

              </div>

              {/* Round Info */}
              <div className="mt-6 text-center">
                <div className="text-sm text-zinc-500">
                  Round {(match.currentRound || 0) + 1} • MR15 (Primeiro a 16)
                </div>
              </div>
            </div>

            {/* Match Info */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Mapa</div>
                  <div className="text-sm font-bold text-zinc-100">
                    {match.selectedMap?.replace(/_/g, " ") || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Região</div>
                  <div className="text-sm font-bold text-zinc-100">
                    {match.selectedLocation || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Modo</div>
                  <div className="text-sm font-bold text-orange-600">1v1</div>
                </div>
              </div>
            </div>

            {/* Server Info */}
            {match.serverIp && (
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Servidor</div>
                <code className="text-sm font-mono text-orange-600">
                  connect {match.serverIp}
                </code>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* RIGHT PANEL - PLAYER B */}
      <div className={`w-[250px] border-l-4 ${isPlayerB ? 'border-orange-500' : 'border-zinc-800'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <LivePlayerPanel 
          player={playerB} 
          isCurrentUser={isPlayerB}
          side="B"
          stats={statsB}
        />
      </div>

    </div>
  );
}

// Live Player Panel Component
function LivePlayerPanel({ 
  player, 
  isCurrentUser, 
  side,
  stats 
}: { 
  player: any; 
  isCurrentUser: boolean;
  side: "A" | "B";
  stats: { kills: number; deaths: number; assists: number; mvps?: number };
}) {
  if (!player) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-zinc-600 animate-spin mx-auto mb-4" />
          <div className="text-sm text-zinc-500">Aguardando jogador...</div>
        </div>
      </div>
    );
  }

  const kd = stats.deaths === 0 ? stats.kills.toFixed(2) : (stats.kills / stats.deaths).toFixed(2);

  return (
    <div className="flex-1 flex flex-col p-6">
      
      {/* Current User Badge */}
      {isCurrentUser && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500 rounded-full px-4 py-2">
            <span className="text-xs font-bold text-orange-500 uppercase">TU</span>
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className="mb-6">
        <div className={`w-32 h-32 mx-auto rounded-full border-4 ${isCurrentUser ? 'border-orange-500' : 'border-zinc-700'} bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center overflow-hidden`}>
          {player.avatarUrl ? (
            <img src={player.avatarUrl} alt={player.displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl font-black text-zinc-600">
              {(player.displayName || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="text-center mb-4">
        <div className="text-xl font-black text-zinc-100 mb-1">
          {player.displayName || player.clerkId?.substring(0, 10) || "Jogador"}
        </div>
      </div>

      {/* ELO */}
      <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-zinc-400">ELO</span>
          </div>
          <span className="text-2xl font-black text-orange-500">
            {player.elo_1v1 || 1000}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Target className="w-4 h-4" />
            <span className="text-sm">Kills</span>
          </div>
          <span className="text-lg font-bold text-green-500">{stats.kills}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Skull className="w-4 h-4" />
            <span className="text-sm">Deaths</span>
          </div>
          <span className="text-lg font-bold text-red-500">{stats.deaths}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Award className="w-4 h-4" />
            <span className="text-sm">Assists</span>
          </div>
          <span className="text-lg font-bold text-blue-500">{stats.assists}</span>
        </div>

        {/* K/D Ratio */}
        <div className="pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">K/D</span>
            <span className="text-lg font-bold text-orange-600">{kd}</span>
          </div>
        </div>
      </div>

      {/* Side Badge */}
      <div className="mt-auto">
        <div className={`text-center py-3 rounded-lg font-black text-lg uppercase ${side === "A" ? "bg-blue-500/20 text-blue-500" : "bg-red-500/20 text-red-500"}`}>
          {side === "A" ? "CT" : "T"}
        </div>
      </div>

      {/* VS Icon */}
      <div className="mt-4 flex justify-center">
        <Swords className="w-8 h-8 text-zinc-600" />
      </div>

    </div>
  );
}
