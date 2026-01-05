"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  console.log("🎯 RESULT PAGE LOADED - matchId:", matchId);

  const matchData = useQuery(api.matchQueries.getMatchDetails, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    console.log("🎯 RESULT PAGE - Match data:", matchData?.match.state);
    console.log("🎯 RESULT PAGE - Current URL:", window.location.href);
  }, [matchData]);

  // Play victory/defeat sound on mount
  useEffect(() => {
    if (!matchData || !currentUser) return;

    const isWinner =
      matchData.match.teamA.includes(currentUser._id) &&
      matchData.match.scoreTeamA! > matchData.match.scoreTeamB!
      ||
      matchData.match.teamB.includes(currentUser._id) &&
      matchData.match.scoreTeamB! > matchData.match.scoreTeamA!;

    // TODO: Add sound effects here
    console.log(isWinner ? "🎉 Victory sound" : "😢 Defeat sound");
  }, [matchData, currentUser]);

  if (!matchData || !currentUser) {
    console.log("🎯 RESULT PAGE - Loading... matchData:", !!matchData, "currentUser:", !!currentUser);
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando resultados...</div>
      </div>
    );
  }

  console.log("🎯 RESULT PAGE - Rendering with match state:", matchData.match.state);

  const { match, players, teamAPlayers, teamBPlayers } = matchData;

  const isUserInTeamA = match.teamA.includes(currentUser._id);
  const isUserInTeamB = match.teamB.includes(currentUser._id);

  const userWon =
    (isUserInTeamA && match.scoreTeamA! > match.scoreTeamB!) ||
    (isUserInTeamB && match.scoreTeamB! > match.scoreTeamA!);

  const mvpPlayer = players.find(p => p.userId === match.mvpId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header - Victory/Defeat */}
        <div className="text-center mb-12">
          <h1
            className={`text-8xl font-black uppercase tracking-wider mb-4 ${
              userWon
                ? "text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                : "text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"
            }`}
          >
            {userWon ? "VITÓRIA" : "DERROTA"}
          </h1>
          <div className="text-4xl font-bold text-zinc-400">
            {match.scoreTeamA} - {match.scoreTeamB}
          </div>
          <div className="text-xl text-zinc-500 mt-2">{match.selectedMap}</div>
        </div>

        {/* MVP Card */}
        {mvpPlayer && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border-2 border-yellow-600 rounded-lg p-8 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Trophy className="h-12 w-12 text-yellow-500" />
                <h2 className="text-3xl font-black uppercase text-yellow-500">
                  MVP DA PARTIDA
                </h2>
                <Trophy className="h-12 w-12 text-yellow-500" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-4">
                  {mvpPlayer.clerkId?.substring(0, 10) || "MVP"}
                </div>
                <div className="flex justify-center gap-8 text-lg">
                  <div>
                    <span className="text-green-400 font-bold">{mvpPlayer.kills}</span>
                    <span className="text-zinc-400"> Kills</span>
                  </div>
                  <div>
                    <span className="text-yellow-400 font-bold">{mvpPlayer.assists}</span>
                    <span className="text-zinc-400"> Assists</span>
                  </div>
                  <div>
                    <span className="text-red-400 font-bold">{mvpPlayer.deaths}</span>
                    <span className="text-zinc-400"> Deaths</span>
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">{mvpPlayer.mvps}</span>
                    <span className="text-zinc-400"> MVPs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ELO Impact Table */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-3xl font-black uppercase text-center mb-6 text-orange-500">
            Impacto de ELO
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 text-blue-400">TEAM A</h3>
              <div className="space-y-3">
                {teamAPlayers.map((player: any) => {
                  const eloChange = player.eloChange || 0;
                  const oldElo = player.oldElo || 1000;
                  const newElo = player.newElo || 1000;

                  return (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border border-zinc-700"
                    >
                      <div className="font-semibold">
                        {player.clerkId?.substring(0, 10) || "Player"}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-zinc-400">{oldElo}</div>
                        <ArrowRight className="h-4 w-4 text-zinc-600" />
                        <div className="font-bold text-white">{newElo}</div>
                        <div
                          className={`px-3 py-1 rounded font-bold ${
                            eloChange > 0
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {eloChange > 0 ? "+" : ""}
                          {eloChange}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 text-orange-400">TEAM B</h3>
              <div className="space-y-3">
                {teamBPlayers.map((player: any) => {
                  const eloChange = player.eloChange || 0;
                  const oldElo = player.oldElo || 1000;
                  const newElo = player.newElo || 1000;

                  return (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded border border-zinc-700"
                    >
                      <div className="font-semibold">
                        {player.clerkId?.substring(0, 10) || "Player"}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-zinc-400">{oldElo}</div>
                        <ArrowRight className="h-4 w-4 text-zinc-600" />
                        <div className="font-bold text-white">{newElo}</div>
                        <div
                          className={`px-3 py-1 rounded font-bold ${
                            eloChange > 0
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          }`}
                        >
                          {eloChange > 0 ? "+" : ""}
                          {eloChange}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Final Stats */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-3xl font-black uppercase text-center mb-6 text-orange-500">
            Estatísticas Finais
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team A Stats */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 text-blue-400">TEAM A</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-zinc-400 pb-2 border-b border-zinc-700">
                  <div>JOGADOR</div>
                  <div className="text-center">K</div>
                  <div className="text-center">A</div>
                  <div className="text-center">D</div>
                  <div className="text-center">MVP</div>
                </div>
                {teamAPlayers.map((player: any) => (
                  <div key={player.userId} className="grid grid-cols-5 gap-2 p-2 rounded bg-zinc-800/30">
                    <div className="truncate">{player.clerkId?.substring(0, 10) || "Player"}</div>
                    <div className="text-center text-green-400 font-bold">{player.kills}</div>
                    <div className="text-center text-yellow-400">{player.assists}</div>
                    <div className="text-center text-red-400">{player.deaths}</div>
                    <div className="text-center text-purple-400">{player.mvps}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B Stats */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-xl font-bold mb-4 text-orange-400">TEAM B</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-zinc-400 pb-2 border-b border-zinc-700">
                  <div>JOGADOR</div>
                  <div className="text-center">K</div>
                  <div className="text-center">A</div>
                  <div className="text-center">D</div>
                  <div className="text-center">MVP</div>
                </div>
                {teamBPlayers.map((player: any) => (
                  <div key={player.userId} className="grid grid-cols-5 gap-2 p-2 rounded bg-zinc-800/30">
                    <div className="truncate">{player.clerkId?.substring(0, 10) || "Player"}</div>
                    <div className="text-center text-green-400 font-bold">{player.kills}</div>
                    <div className="text-center text-yellow-400">{player.assists}</div>
                    <div className="text-center text-red-400">{player.deaths}</div>
                    <div className="text-center text-purple-400">{player.mvps}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => router.push("/")}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-6 text-lg"
          >
            VOLTAR AO MENU
          </Button>
          <Button
            onClick={() => router.push(`/matches/${matchId}`)}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800 font-bold px-8 py-6 text-lg"
          >
            VER DETALHES
          </Button>
        </div>
      </div>
    </div>
  );
}
