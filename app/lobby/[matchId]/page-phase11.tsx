"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MapPin, Trophy, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// PHASE 11 SPECIAL: Faceit-style 3-column lobby with linear veto flow
export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const match = useQuery(api.matches.getMatchById, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const banLocation = useMutation(api.lobbyLocation.banLocation);
  const banMap = useMutation(api.lobby.banMap);
  const provisionServer = useAction(api.lobbyDatHost.provisionDatHostServer);

  const [isProvisioning, setIsProvisioning] = useState(false);

  // Auto-redirect to live page when match goes LIVE
  useEffect(() => {
    if (match?.state === "LIVE") {
      router.push(`/match/${matchId}/live`);
    }
  }, [match?.state, matchId, router]);

  // Auto-provision server when CONFIGURING and no serverIp
  useEffect(() => {
    if (
      match?.state === "CONFIGURING" &&
      !match.serverIp &&
      !isProvisioning
    ) {
      setIsProvisioning(true);
      provisionServer({ matchId })
        .then(() => {
          toast.success("✅ Servidor Provisionado!");
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsProvisioning(false);
        });
    }
  }, [match?.state, match?.serverIp, isProvisioning, matchId, provisionServer, toast]);

  if (!match) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  const playerA = match.teamAPlayers?.[0];
  const playerB = match.teamBPlayers?.[0];
  const currentUserId = currentUser?._id;
  const isPlayerA = currentUserId === playerA?._id;

  // Determine current stage
  const getStage = () => {
    if (match.state === "VETO" && !match.selectedLocation) return "LOCATION";
    if (match.state === "VETO" && match.selectedLocation && !match.selectedMap) return "MAP";
    if (match.state === "CONFIGURING" || (match.state === "WARMUP" && !match.serverIp)) return "PROVISIONING";
    if (match.state === "WARMUP" && match.serverIp) return "READY";
    return "UNKNOWN";
  };

  const stage = getStage();

  const handleLocationBan = async (location: string) => {
    try {
      await banLocation({ matchId, location });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMapBan = async (map: string) => {
    try {
      await banMap({ matchId, mapName: map });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyServerIp = () => {
    if (match.serverIp) {
      navigator.clipboard.writeText(`connect ${match.serverIp}`);
      toast.success("✅ Comando copiado!");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* 3-Column Faceit Layout */}
      <div className="h-screen grid grid-cols-[300px_1fr_300px] gap-4 p-4">
        
        {/* LEFT COLUMN - Player A */}
        <div className="flex flex-col gap-4">
          <PlayerCard
            player={playerA}
            isCurrentUser={isPlayerA}
            label="JOGADOR A"
            side="left"
          />
        </div>

        {/* CENTER COLUMN - The Stage */}
        <div className="flex flex-col items-center justify-center gap-6 bg-zinc-900/30 backdrop-blur-sm rounded-lg border border-zinc-800 p-8">
          
          {/* Stage Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black text-orange-600 uppercase tracking-wider mb-2">
              {stage === "LOCATION" && "Escolha a Região"}
              {stage === "MAP" && "Escolha o Mapa"}
              {stage === "PROVISIONING" && "A Provisionar Servidor"}
              {stage === "READY" && "Servidor Pronto"}
            </h1>
            <p className="text-zinc-400 text-sm">
              {stage === "LOCATION" && "Banimento alternado até sobrar 1 região"}
              {stage === "MAP" && "Banimento alternado até sobrar 1 mapa"}
              {stage === "PROVISIONING" && "Aguarde enquanto configuramos o servidor..."}
              {stage === "READY" && "Conecte-se ao servidor e prepare-se!"}
            </p>
          </div>

          {/* Stage Content */}
          <div className="w-full max-w-3xl">
            
            {/* STAGE 1: Location Veto */}
            {stage === "LOCATION" && (
              <div className="grid grid-cols-3 gap-4">
                {match.locationPool?.map((location) => {
                  const isBanned = match.bannedLocations?.includes(location);
                  // Determine whose turn it is based on ban count
                  const banCount = match.bannedLocations?.length || 0;
                  const isMyTurn = (banCount % 2 === 0) === isPlayerA;
                  
                  return (
                    <button
                      key={location}
                      onClick={() => !isBanned && isMyTurn && handleLocationBan(location)}
                      disabled={isBanned || !isMyTurn}
                      className={`
                        relative h-40 rounded-lg border-2 transition-all
                        ${isBanned 
                          ? "opacity-30 grayscale border-zinc-800" 
                          : "border-zinc-700 hover:border-orange-600 hover:scale-105"
                        }
                        ${!isBanned && isMyTurn ? "cursor-pointer" : "cursor-not-allowed"}
                      `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg" />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2">
                        <MapPin className="w-8 h-8 text-orange-600" />
                        <span className="text-lg font-bold uppercase">{location}</span>
                        {isBanned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-1 bg-red-600 rotate-45" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STAGE 2: Map Veto */}
            {stage === "MAP" && (
              <div className="grid grid-cols-3 gap-4">
                {match.mapPool?.map((map) => {
                  const isBanned = match.bannedMaps?.includes(map);
                  // Determine whose turn it is based on ban count
                  const banCount = match.bannedMaps?.length || 0;
                  const isMyTurn = (banCount % 2 === 0) === isPlayerA;
                  
                  return (
                    <button
                      key={map}
                      onClick={() => !isBanned && isMyTurn && handleMapBan(map)}
                      disabled={isBanned || !isMyTurn}
                      className={`
                        relative h-32 rounded-lg border-2 transition-all
                        ${isBanned 
                          ? "opacity-30 grayscale border-zinc-800" 
                          : "border-zinc-700 hover:border-orange-600 hover:scale-105"
                        }
                        ${!isBanned && isMyTurn ? "cursor-pointer" : "cursor-not-allowed"}
                      `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-lg" />
                      <div className="relative z-10 h-full flex items-center justify-center">
                        <span className="text-sm font-bold uppercase text-center px-2">
                          {map.replace("_", " ")}
                        </span>
                        {isBanned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-1 bg-red-600 rotate-45" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* STAGE 3: Provisioning */}
            {stage === "PROVISIONING" && (
              <div className="flex flex-col items-center gap-6 py-12">
                <Loader2 className="w-24 h-24 text-orange-600 animate-spin" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600 uppercase">
                    A Provisionar Servidor em {match.selectedLocation}
                  </p>
                  <p className="text-zinc-400 mt-2">
                    Mapa: {match.selectedMap?.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 4: Ready */}
            {stage === "READY" && match.serverIp && (
              <div className="flex flex-col items-center gap-6 py-12">
                <Trophy className="w-24 h-24 text-orange-600" />
                <div className="text-center">
                  <p className="text-xl font-bold text-zinc-400 mb-4">SERVIDOR PRONTO</p>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <code className="text-3xl font-mono text-orange-600 font-bold">
                      {match.serverIp}
                    </code>
                  </div>
                  <Button
                    onClick={copyServerIp}
                    className="mt-6 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase px-8 py-6 text-lg"
                  >
                    <Copy className="w-5 h-5 mr-2" />
                    Copiar Comando
                  </Button>
                  <p className="text-zinc-500 text-sm mt-4">
                    Cole no console do CS2: <code className="text-orange-600">connect {match.serverIp}</code>
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Turn Indicator */}
          {(stage === "LOCATION" || stage === "MAP") && (
            <div className="text-center">
              <p className="text-sm text-zinc-500 uppercase tracking-wider">
                {(() => {
                  const banCount = stage === "LOCATION" 
                    ? (match.bannedLocations?.length || 0)
                    : (match.bannedMaps?.length || 0);
                  const isMyTurn = (banCount % 2 === 0) === isPlayerA;
                  return isMyTurn 
                    ? "🟢 É A TUA VEZ DE BANIR" 
                    : "🔴 Aguarda o adversário banir";
                })()}
              </p>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN - Player B */}
        <div className="flex flex-col gap-4">
          <PlayerCard
            player={playerB}
            isCurrentUser={!isPlayerA}
            label="JOGADOR B"
            side="right"
          />
        </div>

      </div>
    </div>
  );
}

// Player Card Component
function PlayerCard({ 
  player, 
  isCurrentUser, 
  label, 
  side 
}: { 
  player: any; 
  isCurrentUser: boolean; 
  label: string; 
  side: "left" | "right";
}) {
  if (!player) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-6 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`
      bg-zinc-900/50 backdrop-blur-sm rounded-lg border-2 p-6 h-full flex flex-col
      ${isCurrentUser ? "border-orange-600" : "border-zinc-800"}
    `}>
      {/* Label */}
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4 font-bold">
        {label} {isCurrentUser && "(TU)"}
      </div>

      {/* Avatar */}
      <div className="flex items-center justify-center mb-6">
        <div className={`
          w-32 h-32 rounded-full border-4 flex items-center justify-center
          ${isCurrentUser ? "border-orange-600 bg-orange-600/20" : "border-zinc-700 bg-zinc-800"}
        `}>
          <User className="w-16 h-16 text-zinc-400" />
        </div>
      </div>

      {/* Player Info */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-zinc-100 mb-2">
          {player.displayName || player.clerkId?.substring(0, 10) || "Jogador"}
        </h2>
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-4 h-4 text-orange-600" />
          <span className="text-xl font-bold text-orange-600">
            {player.elo_1v1 || 1000}
          </span>
          <span className="text-sm text-zinc-500">ELO</span>
        </div>
      </div>

      {/* Recent Stats */}
      <div className="mt-auto space-y-2">
        <div className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">
          Estatísticas Recentes
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-lg font-bold text-green-500">12</div>
            <div className="text-xs text-zinc-500">Vitórias</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-lg font-bold text-red-500">8</div>
            <div className="text-xs text-zinc-500">Derrotas</div>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <div className="text-lg font-bold text-orange-500">60%</div>
            <div className="text-xs text-zinc-500">WR</div>
          </div>
        </div>
      </div>
    </div>
  );
}
