"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { 
  Users,
  Map,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Shield,
  Crosshair,
  Loader2
} from "lucide-react";

/**
 * FASE 54: MATCH ROOM COMPONENT
 * Pre-game lobby with veto, lineups, and fan voting
 */

interface MatchRoomProps {
  matchId: Id<"matches">;
  tournamentMatchId?: Id<"tournament_matches">;
}

export function MatchRoom({ matchId, tournamentMatchId }: MatchRoomProps) {
  const matchData = useQuery(api.matchRoom.getMatchRoomData, { matchId });
  const veto = useQuery(api.matchRoom.getVeto, { matchId });
  const fanVotes = useQuery(api.matchRoom.getFanVotes, { matchId, tournamentMatchId });
  const myVote = useQuery(api.matchRoom.getMyVote, { matchId, tournamentMatchId });
  const currentUser = useQuery(api.users.getCurrentUser);

  const makeVetoAction = useMutation(api.matchRoom.makeVetoAction);
  const castVote = useMutation(api.matchRoom.castFanVote);

  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [isVetoing, setIsVetoing] = useState(false);

  if (!matchData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const { match, teamA, teamB } = matchData;
  const isMyTurn = veto && currentUser && veto.currentTurn === currentUser._id;
  const isBanPhase = veto?.phase?.startsWith("BAN");
  const isPickPhase = veto?.phase === "PICK1";
  const isSidePickPhase = veto?.phase === "PICK2";

  const handleVetoAction = async (map: string, side?: string) => {
    if (!veto || isVetoing) return;
    setIsVetoing(true);
    try {
      await makeVetoAction({
        vetoId: veto._id,
        map,
        side,
      });
      setSelectedMap(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVetoing(false);
    }
  };

  const handleVote = async (team: number) => {
    try {
      await castVote({
        matchId,
        tournamentMatchId,
        votedForTeam: team,
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const mapImages: Record<string, string> = {
    de_ancient: "🏛️",
    de_anubis: "🐍",
    de_dust2: "🏜️",
    de_inferno: "🔥",
    de_mirage: "🌴",
    de_nuke: "☢️",
    de_vertigo: "🏗️",
  };

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            match.state === "LIVE" 
              ? "bg-red-500/20 text-red-400 animate-pulse" 
              : match.state === "VETO"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-zinc-500/20 text-zinc-400"
          }`}>
            {match.state}
          </span>
          {match.selectedMap && (
            <span className="text-zinc-400 flex items-center gap-2">
              <Map className="w-4 h-4" />
              {match.selectedMap}
            </span>
          )}
        </div>

        {/* Lineups */}
        <div className="grid grid-cols-2 gap-8">
          {/* Team A */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Team A
            </h3>
            <div className="space-y-2">
              {teamA.map((player: any) => (
                <div 
                  key={player._id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.isConnected 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-zinc-800/50"
                  }`}
                >
                  <img 
                    src={player.steamAvatar || "/default-avatar.png"} 
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.nickname || player.steamName}</p>
                    <p className="text-xs text-zinc-500">ELO: {player.elo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isReady && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {player.isConnected && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team B */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-red-500" />
              Team B
            </h3>
            <div className="space-y-2">
              {teamB.map((player: any) => (
                <div 
                  key={player._id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.isConnected 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-zinc-800/50"
                  }`}
                >
                  <img 
                    src={player.steamAvatar || "/default-avatar.png"} 
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.nickname || player.steamName}</p>
                    <p className="text-xs text-zinc-500">ELO: {player.elo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {player.isReady && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {player.isConnected && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score (if live) */}
        {match.state === "LIVE" && (
          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <div className="flex items-center justify-center gap-8">
              <span className="text-4xl font-black text-blue-500">{match.scoreTeamA}</span>
              <span className="text-2xl text-zinc-600">-</span>
              <span className="text-4xl font-black text-red-500">{match.scoreTeamB}</span>
            </div>
          </div>
        )}
      </div>

      {/* Veto System */}
      {veto && veto.phase !== "COMPLETED" && (
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-orange-500" />
              Map Veto
            </h3>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-400">
                {veto.phase === "BAN1" || veto.phase === "BAN2" || veto.phase === "BAN3" || veto.phase === "BAN4" 
                  ? "Ban Phase" 
                  : veto.phase === "PICK1"
                  ? "Pick Map"
                  : veto.phase === "PICK2"
                  ? "Pick Side"
                  : "Decider"}
              </span>
            </div>
          </div>

          {/* Current Turn Indicator */}
          <div className={`p-3 rounded-lg mb-4 ${isMyTurn ? "bg-orange-500/20 border border-orange-500/30" : "bg-zinc-800"}`}>
            <p className="text-center font-medium">
              {isMyTurn ? (
                <span className="text-orange-400">A tua vez de {isBanPhase ? "banir" : "escolher"}!</span>
              ) : (
                <span className="text-zinc-400">
                  A aguardar {veto.currentTurn === veto.captain1?._id ? veto.captain1?.nickname : veto.captain2?.nickname}...
                </span>
              )}
            </p>
          </div>

          {/* Map Grid */}
          {!isSidePickPhase ? (
            <div className="grid grid-cols-4 gap-3">
              {veto.mapPool.map((map: string) => {
                const isBanned = veto.bans.some((b: any) => b.map === map);
                const isPicked = veto.picks.some((p: any) => p.map === map);
                const isAvailable = !isBanned && !isPicked;
                const isSelected = selectedMap === map;

                return (
                  <button
                    key={map}
                    onClick={() => isMyTurn && isAvailable && setSelectedMap(map)}
                    disabled={!isMyTurn || !isAvailable}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isBanned
                        ? "bg-red-500/10 border-red-500/30 opacity-50"
                        : isPicked
                        ? "bg-green-500/10 border-green-500/30"
                        : isSelected
                        ? "bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/50"
                        : isAvailable && isMyTurn
                        ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600 cursor-pointer"
                        : "bg-zinc-800/50 border-zinc-800 opacity-50"
                    }`}
                  >
                    <span className="text-3xl">{mapImages[map] || "🗺️"}</span>
                    <p className="text-sm font-medium text-white mt-2">{map.replace("de_", "")}</p>
                    
                    {isBanned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                    {isPicked && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Side Pick */
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => isMyTurn && handleVetoAction(veto.selectedMap || "", "CT")}
                disabled={!isMyTurn || isVetoing}
                className={`p-6 rounded-xl border transition-all ${
                  isMyTurn 
                    ? "bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30 cursor-pointer"
                    : "bg-zinc-800 border-zinc-700 opacity-50"
                }`}
              >
                <Shield className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">Counter-Terrorist</p>
                <p className="text-sm text-zinc-400">Começar como CT</p>
              </button>
              <button
                onClick={() => isMyTurn && handleVetoAction(veto.selectedMap || "", "T")}
                disabled={!isMyTurn || isVetoing}
                className={`p-6 rounded-xl border transition-all ${
                  isMyTurn 
                    ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 cursor-pointer"
                    : "bg-zinc-800 border-zinc-700 opacity-50"
                }`}
              >
                <Crosshair className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">Terrorist</p>
                <p className="text-sm text-zinc-400">Começar como T</p>
              </button>
            </div>
          )}

          {/* Confirm Button */}
          {selectedMap && isMyTurn && !isSidePickPhase && (
            <button
              onClick={() => handleVetoAction(selectedMap)}
              disabled={isVetoing}
              className="mt-4 w-full py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isVetoing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isBanPhase ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  {isBanPhase ? `Banir ${selectedMap.replace("de_", "")}` : `Escolher ${selectedMap.replace("de_", "")}`}
                </>
              )}
            </button>
          )}

          {/* Veto History */}
          {(veto.bans.length > 0 || veto.picks.length > 0) && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500 mb-2">Histórico:</p>
              <div className="flex flex-wrap gap-2">
                {veto.bans.map((ban: any, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">
                    ✕ {ban.map.replace("de_", "")}
                  </span>
                ))}
                {veto.picks.map((pick: any, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                    ✓ {pick.map.replace("de_", "")} {pick.side && `(${pick.side})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fan Vote Widget */}
      {fanVotes && (
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-orange-500" />
            Quem vai ganhar?
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => handleVote(1)}
              className={`p-4 rounded-xl border transition-all ${
                myVote === 1
                  ? "bg-blue-500/20 border-blue-500"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <p className="font-bold text-white mb-2">Team A</p>
              <p className="text-3xl font-black text-blue-500">{fanVotes.team1Percent}%</p>
            </button>
            <button
              onClick={() => handleVote(2)}
              className={`p-4 rounded-xl border transition-all ${
                myVote === 2
                  ? "bg-red-500/20 border-red-500"
                  : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
              }`}
            >
              <p className="font-bold text-white mb-2">Team B</p>
              <p className="text-3xl font-black text-red-500">{fanVotes.team2Percent}%</p>
            </button>
          </div>

          {/* Vote Bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${fanVotes.team1Percent}%` }}
            />
          </div>
          <p className="text-center text-sm text-zinc-500 mt-2">
            {fanVotes.totalVotes} votos
          </p>
        </div>
      )}

      {/* Server Info */}
      {match.serverIp && match.state !== "FINISHED" && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <p className="text-green-400 font-medium text-center">
            Servidor pronto! Conecta em: <code className="bg-black/30 px-2 py-1 rounded">{match.serverIp}</code>
          </p>
        </div>
      )}
    </div>
  );
}
