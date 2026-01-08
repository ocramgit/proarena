"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { 
  Trophy, 
  ChevronLeft,
  Users,
  Calendar,
  Coins,
  Play,
  CheckCircle,
  Clock,
  UserPlus,
  Settings,
  AlertCircle
} from "lucide-react";

/**
 * FASE 51: TOURNAMENT DETAIL PAGE WITH LIVE BRACKET
 */

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.tournamentId as Id<"tournaments">;
  
  const tournament = useQuery(api.tournaments.getTournament, { tournamentId });
  const canOrganize = useQuery(api.tournaments.canOrganize);
  const startTournament = useMutation(api.tournaments.startTournament);
  const registerTeam = useMutation(api.tournaments.registerTeam);
  const forceResult = useMutation(api.tournamentOrchestrator.forceMatchResult);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tournament) {
    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REGISTRATION":
        return { text: "Inscrições Abertas", color: "bg-green-500", icon: CheckCircle };
      case "CHECKIN":
        return { text: "Check-in", color: "bg-yellow-500", icon: Clock };
      case "ONGOING":
        return { text: "A Decorrer", color: "bg-orange-500 animate-pulse", icon: Play };
      case "FINISHED":
        return { text: "Terminado", color: "bg-zinc-600", icon: Trophy };
      default:
        return { text: status, color: "bg-zinc-600", icon: Trophy };
    }
  };

  const handleRegister = async () => {
    if (!teamName.trim()) {
      setError("Nome da equipa é obrigatório");
      return;
    }
    setIsRegistering(true);
    setError(null);
    try {
      await registerTeam({
        tournamentId,
        teamName: teamName.trim(),
      });
      setShowRegisterModal(false);
      setTeamName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStartTournament = async () => {
    try {
      await startTournament({ tournamentId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const status = getStatusBadge(tournament.status);
  const StatusIcon = status.icon;

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/tournaments")}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-white ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.text}
                </span>
                <span className="text-zinc-400 text-sm flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {tournament.mode} • {tournament.teams?.length || 0}/{tournament.maxTeams}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {tournament.status === "REGISTRATION" && (
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white font-bold"
                >
                  <UserPlus className="w-5 h-5" />
                  Inscrever
                </button>
              )}
              {canOrganize && tournament.status === "REGISTRATION" && (
                <button
                  onClick={handleStartTournament}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold"
                >
                  <Play className="w-5 h-5" />
                  Iniciar
                </button>
              )}
              {canOrganize && (
                <button className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400">
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-xs text-zinc-500">Data de Início</div>
                  <div className="text-white font-medium">{formatDate(tournament.startDate)}</div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-xs text-zinc-500">Participantes</div>
                  <div className="text-white font-medium">{tournament.teams?.length || 0} / {tournament.maxTeams}</div>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-xs text-zinc-500">Prémio</div>
                  <div className="text-yellow-500 font-bold">
                    {tournament.prizeMode === "SOBERANAS" && tournament.prizePool
                      ? `${tournament.prizePool} Ⓢ`
                      : tournament.prize1st || "A anunciar"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bracket */}
          {tournament.totalRounds > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Bracket
              </h2>
              <TournamentBracket 
                rounds={tournament.rounds} 
                totalRounds={tournament.totalRounds}
                canOrganize={canOrganize || false}
                onForceResult={async (matchId, winnerId, score1, score2) => {
                  await forceResult({ 
                    tournamentMatchId: matchId, 
                    winnerTeamId: winnerId, 
                    score1, 
                    score2 
                  });
                }}
              />
            </div>
          ) : (
            <div className="text-center py-12 bg-zinc-900 rounded-xl border border-zinc-800">
              <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Bracket não gerada</h3>
              <p className="text-zinc-500">A bracket será gerada quando o torneio iniciar</p>
            </div>
          )}

          {/* Registered Teams */}
          {tournament.teams && tournament.teams.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Equipas Inscritas ({tournament.teams.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tournament.teams.map((team: any, idx: number) => (
                  <div 
                    key={team._id} 
                    className={`p-3 rounded-lg bg-zinc-900 border ${team.eliminated ? "border-red-500/30 opacity-50" : "border-zinc-800"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-sm">#{team.seed || idx + 1}</span>
                      <span className="font-medium text-white">{team.name}</span>
                      {team.eliminated && <span className="text-xs text-red-400 ml-auto">Eliminado</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Inscrever no Torneio</h3>
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nome da Equipa
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={tournament.mode === "1v1" ? "O teu nome/nick" : "Nome da equipa"}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {tournament.buyIn && tournament.buyIn > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-500">
                  <Coins className="w-4 h-4" />
                  <span className="font-medium">Buy-in: {tournament.buyIn} Ⓢ</span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegisterModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white font-bold disabled:opacity-50"
              >
                {isRegistering ? "A inscrever..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Bracket Component
function TournamentBracket({ 
  rounds, 
  totalRounds,
  canOrganize,
  onForceResult
}: { 
  rounds: Record<number, any[]>;
  totalRounds: number;
  canOrganize: boolean;
  onForceResult: (matchId: Id<"tournament_matches">, winnerId: Id<"tournament_teams">, score1?: number, score2?: number) => Promise<void>;
}) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  const getRoundName = (round: number, total: number) => {
    const remaining = total - round;
    if (remaining === 0) return "Final";
    if (remaining === 1) return "Semi-Final";
    if (remaining === 2) return "Quartos";
    return `Ronda ${round}`;
  };

  const getMatchStatusStyle = (status: string) => {
    switch (status) {
      case "TBD":
        return "border-zinc-700 bg-zinc-800/50";
      case "SCHEDULED":
        return "border-zinc-600 bg-zinc-800";
      case "LIVE":
        return "border-yellow-500 bg-yellow-500/10 animate-pulse";
      case "FINISHED":
        return "border-green-500/50 bg-zinc-800";
      default:
        return "border-zinc-700 bg-zinc-800/50";
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max">
        {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
          <div key={round} className="flex flex-col">
            {/* Round Header */}
            <div className="text-center mb-4">
              <div className="text-sm font-bold text-zinc-400 uppercase">
                {getRoundName(round, totalRounds)}
              </div>
            </div>

            {/* Matches */}
            <div 
              className="flex flex-col justify-around flex-1 gap-4"
              style={{ 
                paddingTop: `${Math.pow(2, round - 1) * 20}px`,
                gap: `${Math.pow(2, round) * 20}px`
              }}
            >
              {rounds[round]?.map((match: any) => (
                <MatchCard
                  key={match._id}
                  match={match}
                  statusStyle={getMatchStatusStyle(match.status)}
                  isHovered={hoveredPath === match._id}
                  onHover={() => setHoveredPath(match._id)}
                  onLeave={() => setHoveredPath(null)}
                  canOrganize={canOrganize}
                  onForceResult={onForceResult}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Match Card
function MatchCard({
  match,
  statusStyle,
  isHovered,
  onHover,
  onLeave,
  canOrganize,
  onForceResult
}: {
  match: any;
  statusStyle: string;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  canOrganize: boolean;
  onForceResult: (matchId: Id<"tournament_matches">, winnerId: Id<"tournament_teams">, score1?: number, score2?: number) => Promise<void>;
}) {
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  const handleForceWinner = async (winnerId: Id<"tournament_teams">) => {
    await onForceResult(
      match._id,
      winnerId,
      score1 ? Number(score1) : undefined,
      score2 ? Number(score2) : undefined
    );
    setShowScoreModal(false);
  };

  return (
    <>
      <div
        className={`w-56 rounded-lg border-2 overflow-hidden transition-all ${statusStyle} ${isHovered ? "ring-2 ring-orange-500/50" : ""}`}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        {/* Team 1 */}
        <div className={`flex items-center justify-between p-2 border-b border-zinc-700 ${match.winnerId === match.team1Id?._id ? "bg-green-500/10" : ""}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.team1 ? (
              <>
                <span className="text-xs text-zinc-500">#{match.team1.seed || "?"}</span>
                <span className={`font-medium truncate ${match.winnerId === match.team1?._id ? "text-green-400" : "text-white"}`}>
                  {match.team1.name}
                </span>
              </>
            ) : (
              <span className="text-zinc-500 text-sm italic">TBD</span>
            )}
          </div>
          {match.status === "FINISHED" && (
            <span className={`font-bold ${match.winnerId === match.team1?._id ? "text-green-400" : "text-zinc-500"}`}>
              {match.score1 ?? "-"}
            </span>
          )}
        </div>

        {/* Team 2 */}
        <div className={`flex items-center justify-between p-2 ${match.winnerId === match.team2Id?._id ? "bg-green-500/10" : ""}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {match.team2 ? (
              <>
                <span className="text-xs text-zinc-500">#{match.team2.seed || "?"}</span>
                <span className={`font-medium truncate ${match.winnerId === match.team2?._id ? "text-green-400" : "text-white"}`}>
                  {match.team2.name}
                </span>
              </>
            ) : (
              <span className="text-zinc-500 text-sm italic">TBD</span>
            )}
          </div>
          {match.status === "FINISHED" && (
            <span className={`font-bold ${match.winnerId === match.team2?._id ? "text-green-400" : "text-zinc-500"}`}>
              {match.score2 ?? "-"}
            </span>
          )}
        </div>

        {/* Admin Controls */}
        {canOrganize && match.status === "SCHEDULED" && match.team1 && match.team2 && (
          <div className="p-1 bg-zinc-700/50 border-t border-zinc-700">
            <button
              onClick={() => setShowScoreModal(true)}
              className="w-full py-1 text-xs text-orange-400 hover:text-orange-300 font-medium"
            >
              Reportar Resultado
            </button>
          </div>
        )}

        {/* Live indicator */}
        {match.status === "LIVE" && (
          <div className="p-1 bg-yellow-500/20 border-t border-yellow-500/30 text-center">
            <span className="text-xs text-yellow-400 font-bold animate-pulse">🔴 EM CURSO</span>
          </div>
        )}
      </div>

      {/* Score Report Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowScoreModal(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4">Reportar Resultado</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-white">{match.team1?.name}</span>
                <input
                  type="number"
                  value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                  placeholder="0"
                  className="w-16 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white text-center"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-white">{match.team2?.name}</span>
                <input
                  type="number"
                  value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                  placeholder="0"
                  className="w-16 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-white text-center"
                />
              </div>
            </div>

            <div className="text-sm text-zinc-400 mb-4">Forçar vencedor:</div>
            <div className="flex gap-2">
              <button
                onClick={() => handleForceWinner(match.team1Id)}
                className="flex-1 py-2 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 font-medium"
              >
                {match.team1?.name}
              </button>
              <button
                onClick={() => handleForceWinner(match.team2Id)}
                className="flex-1 py-2 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 font-medium"
              >
                {match.team2?.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
