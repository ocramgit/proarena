"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Download, Calendar, MapPin, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const matchData = useQuery(api.matchQueries.getMatchDetails, { matchId });

  if (!matchData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando detalhes da partida...</div>
      </div>
    );
  }

  const { match, history, players, teamAPlayers, teamBPlayers } = matchData;

  const isCancelled = match.state === "CANCELLED";
  const isFinished = match.state === "FINISHED";

  const scoreA = match.scoreTeamA || 0;
  const scoreB = match.scoreTeamB || 0;
  const teamAWon = scoreA > scoreB;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="mb-4 border-zinc-700 text-white hover:bg-zinc-800"
          >
            ← Voltar ao Menu
          </Button>

          <div className="text-center">
            {isCancelled ? (
              <div className="mb-4">
                <h1 className="text-6xl font-black uppercase text-zinc-500 mb-2">
                  PARTIDA CANCELADA
                </h1>
                <p className="text-zinc-400">Esta partida foi cancelada e não conta para as estatísticas</p>
              </div>
            ) : (
              <div className="mb-4">
                <h1 className="text-6xl font-black uppercase text-orange-500 mb-2">
                  DETALHES DA PARTIDA
                </h1>
                <div className="text-4xl font-bold text-zinc-300">
                  {scoreA} - {scoreB}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-6 text-zinc-400 mt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span>{match.selectedMap || "Mapa não selecionado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>
                  {match.finishedAt
                    ? new Date(Number(match.finishedAt)).toLocaleDateString("pt-PT")
                    : "Em andamento"}
                </span>
              </div>
              {match.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span>{Math.round(match.duration / 60)} minutos</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Match Stats - Only show if not cancelled */}
        {!isCancelled && (
          <div className="max-w-6xl mx-auto mb-12">
            <h2 className="text-3xl font-black uppercase text-center mb-6 text-orange-500">
              Estatísticas Finais
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team A */}
              <div
                className={`bg-zinc-900/50 border rounded-lg p-6 backdrop-blur-sm ${
                  teamAWon ? "border-green-600" : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-400">TEAM A</h3>
                  {teamAWon && <Trophy className="h-6 w-6 text-yellow-500" />}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-zinc-400 pb-2 border-b border-zinc-700">
                    <div>JOGADOR</div>
                    <div className="text-center">K</div>
                    <div className="text-center">A</div>
                    <div className="text-center">D</div>
                    <div className="text-center">MVP</div>
                  </div>
                  {teamAPlayers.map((player: any) => (
                    <div
                      key={player.userId}
                      className={`grid grid-cols-5 gap-2 p-2 rounded ${
                        player.userId === match.mvpId
                          ? "bg-yellow-600/20 border border-yellow-600"
                          : "bg-zinc-800/30"
                      }`}
                    >
                      <div className="truncate flex items-center gap-1">
                        {player.userId === match.mvpId && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                        {player.clerkId?.substring(0, 10) || "Player"}
                      </div>
                      <div className="text-center text-green-400 font-bold">{player.kills}</div>
                      <div className="text-center text-yellow-400">{player.assists}</div>
                      <div className="text-center text-red-400">{player.deaths}</div>
                      <div className="text-center text-purple-400">{player.mvps}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B */}
              <div
                className={`bg-zinc-900/50 border rounded-lg p-6 backdrop-blur-sm ${
                  !teamAWon ? "border-green-600" : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-orange-400">TEAM B</h3>
                  {!teamAWon && <Trophy className="h-6 w-6 text-yellow-500" />}
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-zinc-400 pb-2 border-b border-zinc-700">
                    <div>JOGADOR</div>
                    <div className="text-center">K</div>
                    <div className="text-center">A</div>
                    <div className="text-center">D</div>
                    <div className="text-center">MVP</div>
                  </div>
                  {teamBPlayers.map((player: any) => (
                    <div
                      key={player.userId}
                      className={`grid grid-cols-5 gap-2 p-2 rounded ${
                        player.userId === match.mvpId
                          ? "bg-yellow-600/20 border border-yellow-600"
                          : "bg-zinc-800/30"
                      }`}
                    >
                      <div className="truncate flex items-center gap-1">
                        {player.userId === match.mvpId && (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        )}
                        {player.clerkId?.substring(0, 10) || "Player"}
                      </div>
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
        )}

        {/* Cancelled Match Info */}
        {isCancelled && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-8 text-center backdrop-blur-sm">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold text-zinc-400 mb-2">
                Esta partida foi cancelada
              </h3>
              <p className="text-zinc-500">
                A partida foi cancelada devido a jogadores ausentes durante o período de aquecimento.
                Nenhuma alteração de ELO foi aplicada.
              </p>
            </div>
          </div>
        )}

        {/* Demo Download - Only if available */}
        {history?.demoUrl && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Demo da Partida</h3>
                  <p className="text-zinc-400">Descarrega a demo para rever a partida</p>
                </div>
                <Button
                  onClick={() => window.open(history.demoUrl, "_blank")}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Descarregar Demo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-12">
          <Button
            onClick={() => router.push("/")}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-8 py-6 text-lg"
          >
            VOLTAR AO MENU
          </Button>
          {isFinished && (
            <Button
              onClick={() => router.push(`/matches/${matchId}/result`)}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800 font-bold px-8 py-6 text-lg"
            >
              VER RESULTADOS
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
