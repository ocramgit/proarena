"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Convert STEAM_0:1:X to Steam64
function steamIdToSteamId64(steamId: string): string {
  const match = steamId.match(/STEAM_0:([01]):(\d+)/);
  if (!match) return steamId;
  
  const y = BigInt(match[1]);
  const z = BigInt(match[2]);
  const accountId = z * BigInt(2) + y;
  const steamId64 = accountId + BigInt("76561197960265728");
  return steamId64.toString();
}

export default function LiveMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const matchData = useQuery(api.matchQueries.getLiveMatchData as any, { matchId });
  const fetchLiveData = useAction(api.dathostLive.fetchLiveMatchData);
  
  const [liveData, setLiveData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Immediate redirect if match is not LIVE
  useEffect(() => {
    if (!matchData) return;
    
    if (matchData.match.state === "FINISHED") {
      console.log("🏁 Match is FINISHED, redirecting to results...");
      router.replace(`/matches/${matchId}/result`);
      return;
    }
    
    if (matchData.match.state !== "LIVE") {
      console.log("⚠️ Match is not LIVE, redirecting to lobby...");
      router.replace(`/lobby/${matchId}`);
      return;
    }
  }, [matchData, matchId, router]);

  // Poll DatHost API every 5 seconds for real-time updates
  useEffect(() => {
    if (!matchData?.match?.dathostMatchId) {
      console.log("⚠️ No dathostMatchId found, cannot poll live data");
      return;
    }

    console.log("🔴 Starting live data polling for match:", matchData.match.dathostMatchId);
    console.log("👥 Team A players Steam IDs:", teamAPlayers.map((p: any) => ({ 
      name: p.displayName, 
      steamId: p.steamId,
      steam_id_64: p.steam_id_64 
    })));
    console.log("👥 Team B players Steam IDs:", teamBPlayers.map((p: any) => ({ 
      name: p.displayName, 
      steamId: p.steamId,
      steam_id_64: p.steam_id_64 
    })));

    const pollLiveData = async () => {
      try {
        const data = await fetchLiveData({ 
          dathostMatchId: matchData.match.dathostMatchId 
        });
        if (data) {
          console.log("✅ Live data received - DatHost steamId64s:", data.players?.map((p: any) => p.steamId64));
          setLiveData(data);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("❌ Error fetching live data:", error);
      }
    };

    // Fetch immediately
    pollLiveData();

    // Then poll every 5 seconds
    const interval = setInterval(pollLiveData, 5000);

    return () => {
      console.log("🛑 Stopping live data polling");
      clearInterval(interval);
    };
  }, [matchData?.match?.dathostMatchId, fetchLiveData]);

  if (!matchData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Carregando partida ao vivo...</div>
      </div>
    );
  }

  // Don't render anything if match is not LIVE
  if (matchData.match.state !== "LIVE") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Redirecionando...</div>
      </div>
    );
  }

  const { match, teamAPlayers, teamBPlayers } = matchData;
  
  // Use live data from DatHost if available, otherwise fall back to database
  const scoreA = liveData?.team1Score ?? match.scoreTeamA ?? 0;
  const scoreB = liveData?.team2Score ?? match.scoreTeamB ?? 0;
  const currentRound = liveData?.roundsPlayed ?? match.currentRound ?? 0;
  
  // Merge live stats with player data
  const getLivePlayerStats = (player: any) => {
    if (!liveData?.players) {
      return player;
    }
    
    // Convert player's Steam ID to Steam64 for matching
    // Database has: STEAM_0:1:172374583
    // DatHost has: 76561198305014895
    const playerSteam64 = player.steamId?.startsWith("STEAM_0:") 
      ? steamIdToSteamId64(player.steamId)
      : player.steamId;
    
    // Match by Steam64 ID
    const livePlayer = liveData.players.find((p: any) => 
      p.steamId64 === playerSteam64
    );
    
    if (livePlayer) {
      // Return player data from database (name) with live stats from DatHost
      return {
        ...player,
        kills: livePlayer.kills,
        deaths: livePlayer.deaths,
        assists: livePlayer.assists,
        mvps: livePlayer.mvps,
        score: livePlayer.score,
        connected: livePlayer.connected,
      };
    }
    
    return player;
  };

  const getStatusText = () => {
    if (match.state === "WARMUP") {
      const timeLeft = match.warmupEndsAt ? Math.max(0, Math.floor((match.warmupEndsAt - Date.now()) / 1000)) : 0;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return `AQUECIMENTO (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }
    if (match.state === "LIVE") {
      return `AO VIVO - RONDA ${currentRound}`;
    }
    return match.state;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="border-purple-600 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20 hover:text-purple-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{match.selectedMap?.toUpperCase()}</h1>
          <p className="text-xl text-purple-300">{getStatusText()}</p>
          {liveData && (
            <p className="text-xs text-gray-500 mt-2">
              🔴 Atualizado em tempo real • Última atualização: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Score Display */}
        <div className="bg-black/50 rounded-lg p-8 mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-400">{scoreA}</div>
              <div className="text-xl mt-2 text-gray-300">TEAM A</div>
            </div>
            <div className="text-4xl font-bold text-gray-500">-</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-orange-400">{scoreB}</div>
              <div className="text-xl mt-2 text-gray-300">TEAM B</div>
            </div>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team A */}
          <div className="bg-black/50 rounded-lg p-6 backdrop-blur-sm border-2 border-blue-500">
            <h2 className="text-2xl font-bold mb-4 text-blue-400">TEAM A</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-gray-400 pb-2 border-b border-gray-700">
                <div>JOGADOR</div>
                <div className="text-center">K</div>
                <div className="text-center">A</div>
                <div className="text-center">D</div>
                <div className="text-center">MVP</div>
              </div>
              {teamAPlayers.map((player: any) => {
                const livePlayer = getLivePlayerStats(player);
                return (
                  <div
                    key={player.userId}
                    className={`grid grid-cols-5 gap-2 p-2 rounded ${
                      livePlayer.connected ? "bg-green-900/20" : "bg-red-900/20"
                    }`}
                  >
                    <div className="truncate">
                      {player.displayName || player.clerkId?.substring(0, 10) || player.steamId}
                      {!livePlayer.connected && (
                        <span className="ml-2 text-xs text-red-400">(Desconectado)</span>
                      )}
                    </div>
                    <div className="text-center font-bold text-green-400">{livePlayer.kills}</div>
                    <div className="text-center text-yellow-400">{livePlayer.assists}</div>
                    <div className="text-center text-red-400">{livePlayer.deaths}</div>
                    <div className="text-center text-purple-400">{livePlayer.mvps}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team B */}
          <div className="bg-black/50 rounded-lg p-6 backdrop-blur-sm border-2 border-orange-500">
            <h2 className="text-2xl font-bold mb-4 text-orange-400">TEAM B</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-sm font-semibold text-gray-400 pb-2 border-b border-gray-700">
                <div>JOGADOR</div>
                <div className="text-center">K</div>
                <div className="text-center">A</div>
                <div className="text-center">D</div>
                <div className="text-center">MVP</div>
              </div>
              {teamBPlayers.map((player: any) => {
                const livePlayer = getLivePlayerStats(player);
                return (
                  <div
                    key={player.userId}
                    className={`grid grid-cols-5 gap-2 p-2 rounded ${
                      livePlayer.connected ? "bg-green-900/20" : "bg-red-900/20"
                    }`}
                  >
                    <div className="truncate">
                      {player.displayName || player.clerkId?.substring(0, 10) || player.steamId}
                      {!livePlayer.connected && (
                        <span className="ml-2 text-xs text-red-400">(Desconectado)</span>
                      )}
                    </div>
                    <div className="text-center font-bold text-green-400">{livePlayer.kills}</div>
                    <div className="text-center text-yellow-400">{livePlayer.assists}</div>
                    <div className="text-center text-red-400">{livePlayer.deaths}</div>
                    <div className="text-center text-purple-400">{livePlayer.mvps}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Server Info */}
        {match.serverIp && (
          <div className="mt-8 bg-black/50 rounded-lg p-6 backdrop-blur-sm text-center">
            <p className="text-gray-400 mb-2">Servidor:</p>
            <p className="text-2xl font-mono font-bold text-purple-400">{match.serverIp}</p>
            <a
              href={`steam://connect/${match.serverIp}`}
              className="inline-block mt-4 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition"
            >
              🎮 CONECTAR VIA STEAM
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
