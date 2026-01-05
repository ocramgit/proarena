"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Trophy, Target, Skull, Award, TrendingUp, TrendingDown, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";

// PHASE 12 VERSUS: Results page with same layout - players on sides, results in center
export default function MatchResultPageVersus() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const matchData = useQuery(api.matchQueries.getMatchDetails, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);

  if (!matchData || !currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando resultados...</div>
      </div>
    );
  }

  const { match, players, teamAPlayers, teamBPlayers } = matchData;

  const playerA = teamAPlayers[0];
  const playerB = teamBPlayers[0];
  const scoreA = match.scoreTeamA || 0;
  const scoreB = match.scoreTeamB || 0;

  const currentUserId = currentUser._id;
  const isPlayerA = currentUserId === playerA?.userId;
  const isPlayerB = currentUserId === playerB?.userId;

  const winner = scoreA > scoreB ? "A" : "B";
  const userWon = (isPlayerA && winner === "A") || (isPlayerB && winner === "B");

  // Get player stats
  const statsA = players.find(p => p.userId === playerA?.userId) || { kills: 0, deaths: 0, assists: 0, mvps: 0, eloChange: 0 };
  const statsB = players.find(p => p.userId === playerB?.userId) || { kills: 0, deaths: 0, assists: 0, mvps: 0, eloChange: 0 };

  // Calculate ELO changes
  const eloChangeA = (statsA as any).eloChange || 0;
  const eloChangeB = (statsB as any).eloChange || 0;

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 flex">
      
      {/* LEFT PANEL - PLAYER A */}
      <div className={`w-[250px] border-r-4 ${winner === "A" ? 'border-green-500' : 'border-red-500'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <ResultPlayerPanel 
          player={playerA} 
          isCurrentUser={isPlayerA}
          side="A"
          stats={statsA}
          won={winner === "A"}
          eloChange={eloChangeA}
        />
      </div>

      {/* CENTER - RESULTS */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className={`text-sm uppercase tracking-wider mb-1 ${userWon ? 'text-green-500' : 'text-red-500'}`}>
              {userWon ? "🎉 VITÓRIA" : "💀 DERROTA"}
            </div>
            <div className="text-lg font-bold text-zinc-100">
              {match.selectedMap?.replace(/_/g, " ").toUpperCase()} • {match.selectedLocation}
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl space-y-8">
            
            {/* Final Score Display */}
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-8">
              <div className="flex items-center justify-center gap-12">
                
                {/* Team A Score */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    {playerA?.clerkId?.substring(0, 10) || "Jogador A"}
                  </div>
                  <div className={`text-8xl font-black ${winner === "A" ? "text-green-500" : "text-zinc-600"}`}>
                    {scoreA}
                  </div>
                  {winner === "A" && (
                    <div className="mt-4">
                      <Trophy className="w-12 h-12 text-yellow-500 mx-auto animate-bounce" />
                    </div>
                  )}
                </div>

                {/* VS Separator */}
                <div className="text-4xl font-black text-zinc-600">-</div>

                {/* Team B Score */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    {playerB?.clerkId?.substring(0, 10) || "Jogador B"}
                  </div>
                  <div className={`text-8xl font-black ${winner === "B" ? "text-green-500" : "text-zinc-600"}`}>
                    {scoreB}
                  </div>
                  {winner === "B" && (
                    <div className="mt-4">
                      <Trophy className="w-12 h-12 text-yellow-500 mx-auto animate-bounce" />
                    </div>
                  )}
                </div>

              </div>

              {/* Match Info */}
              <div className="mt-8 text-center text-sm text-zinc-500">
                Partida finalizada • MR15
              </div>
            </div>

            {/* MVP Card */}
            {match.mvpId && (
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-2 border-yellow-600 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Trophy className="h-8 w-8 text-yellow-500" />
                  <h2 className="text-2xl font-black uppercase text-yellow-500">
                    MVP DA PARTIDA
                  </h2>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-zinc-100">
                    {match.mvpId === playerA?.userId ? (playerA?.clerkId?.substring(0, 10) || "Jogador A") : (playerB?.clerkId?.substring(0, 10) || "Jogador B")}
                  </div>
                  <div className="text-sm text-zinc-400 mt-1">
                    {match.mvpId === playerA?.userId ? statsA.mvps : statsB.mvps} MVPs
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.push("/")}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase px-8 py-6 text-lg"
              >
                Jogar Novamente
              </Button>
              <Button
                onClick={() => router.push("/matches")}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-bold uppercase px-8 py-6 text-lg"
              >
                Ver Histórico
              </Button>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT PANEL - PLAYER B */}
      <div className={`w-[250px] border-l-4 ${winner === "B" ? 'border-green-500' : 'border-red-500'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <ResultPlayerPanel 
          player={playerB} 
          isCurrentUser={isPlayerB}
          side="B"
          stats={statsB}
          won={winner === "B"}
          eloChange={eloChangeB}
        />
      </div>

    </div>
  );
}

// Result Player Panel Component
function ResultPlayerPanel({ 
  player, 
  isCurrentUser, 
  side,
  stats,
  won,
  eloChange
}: { 
  player: any; 
  isCurrentUser: boolean;
  side: "A" | "B";
  stats: any;
  won: boolean;
  eloChange: number;
}) {
  if (!player) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-sm text-zinc-500">Jogador não encontrado</div>
        </div>
      </div>
    );
  }

  const kd = stats.deaths === 0 ? stats.kills.toFixed(2) : (stats.kills / stats.deaths).toFixed(2);

  return (
    <div className="flex-1 flex flex-col p-6">
      
      {/* Result Badge */}
      <div className="mb-4 text-center">
        <div className={`inline-flex items-center gap-2 ${won ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} border rounded-full px-4 py-2`}>
          <span className={`text-xs font-bold uppercase ${won ? 'text-green-500' : 'text-red-500'}`}>
            {won ? "VENCEDOR" : "DERROTADO"}
          </span>
        </div>
      </div>

      {/* Avatar */}
      <div className="mb-6">
        <div className={`w-32 h-32 mx-auto rounded-full border-4 ${won ? 'border-green-500' : 'border-red-500'} bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center overflow-hidden`}>
          <span className="text-5xl font-black text-zinc-600">
            {(player.clerkId?.substring(0, 1) || "?").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Name */}
      <div className="text-center mb-4">
        <div className="text-xl font-black text-zinc-100 mb-1">
          {player.clerkId?.substring(0, 10) || "Jogador"}
        </div>
        {isCurrentUser && (
          <div className="text-xs uppercase tracking-wider text-orange-500 font-bold">TU</div>
        )}
      </div>

      {/* ELO Change */}
      <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-zinc-400">ELO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-orange-500">
              1000
            </span>
            {eloChange !== 0 && (
              <div className={`flex items-center text-sm font-bold ${eloChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {eloChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {eloChange > 0 ? '+' : ''}{eloChange}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Target className="w-4 h-4" />
            <span className="text-sm">Kills</span>
          </div>
          <span className="text-lg font-bold text-green-500">{stats.kills || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Skull className="w-4 h-4" />
            <span className="text-sm">Deaths</span>
          </div>
          <span className="text-lg font-bold text-red-500">{stats.deaths || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Award className="w-4 h-4" />
            <span className="text-sm">Assists</span>
          </div>
          <span className="text-lg font-bold text-blue-500">{stats.assists || 0}</span>
        </div>

        {/* K/D Ratio */}
        <div className="pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">K/D</span>
            <span className="text-lg font-bold text-orange-600">{kd}</span>
          </div>
        </div>

        {/* MVPs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">MVPs</span>
          </div>
          <span className="text-lg font-bold text-yellow-500">{stats.mvps || 0}</span>
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
