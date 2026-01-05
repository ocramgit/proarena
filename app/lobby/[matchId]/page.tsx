"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Copy, Loader2, Swords, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// PHASE 12: Compact VERSUS UI - Players on sides, maps in center
const MAP_IMAGES: Record<string, string> = {
  aim_map: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
  awp_lego_2: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80",
  aim_redline: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=400&q=80",
  fy_pool_day: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=400&q=80",
  aim_ag_texture_city_advanced: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&q=80",
};

const LOCATIONS = [
  { id: "Frankfurt", name: "Frankfurt", flag: "🇩🇪" },
  { id: "Paris", name: "Paris", flag: "🇫🇷" },
  { id: "Madrid", name: "Madrid", flag: "🇪🇸" },
];

export default function LobbyPagePhase12() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const match = useQuery(api.matches.getMatchById, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const banLocation = useMutation(api.lobbyLocation.banLocation);
  const banMap = useMutation(api.lobby.banMap);
  const provisionServer = useAction(api.lobbyDatHost.provisionDatHostServer);
  const autoBanLocationForBots = useMutation(api.lobbyAuto.autoBanLocationForBots);
  const autoBanForBots = useMutation(api.lobbyAuto.autoBanForBots);

  const [copied, setCopied] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Auto-redirect based on match state
  useEffect(() => {
    if (match?.state === "LIVE") {
      router.replace(`/match/${matchId}/live`);
    } else if (match?.state === "FINISHED") {
      router.replace(`/matches/${matchId}/result`);
    }
  }, [match?.state, matchId, router]);

  // Auto-provision server when map is selected
  useEffect(() => {
    // CRITICAL: Check provisioningStarted flag to prevent duplicate server creation
    if (
      match?.state === "CONFIGURING" && 
      !match.serverIp && 
      !match.provisioningStarted && 
      !isProvisioning
    ) {
      console.log("🎮 Starting server provisioning...");
      setIsProvisioning(true);
      provisionServer({ matchId })
        .then(() => {
          console.log("✅ Server provisioned successfully");
          toast.success("Servidor provisionado!");
        })
        .catch((error) => {
          console.error("❌ Server provisioning failed:", error);
          toast.error("Erro ao provisionar servidor");
        })
        .finally(() => setIsProvisioning(false));
    }
  }, [match?.state, match?.serverIp, match?.provisioningStarted, matchId, provisionServer, isProvisioning]);

  // Auto-ban location for bots
  useEffect(() => {
    if (!match || match.state !== "VETO" || match.selectedLocation) return;
    const locationPool = match.locationPool || ["Frankfurt", "Paris", "Madrid"];
    const bannedLocations = match.bannedLocations || [];
    if (bannedLocations.length >= locationPool.length - 1) return;

    const timer = setTimeout(async () => {
      try {
        const result = await autoBanLocationForBots({ matchId });
        if (result.success && result.bannedLocation) {
          toast.info(`🤖 Bot baniu: ${result.bannedLocation}`);
        }
      } catch (error) {
        // Silently fail
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [match?.bannedLocations?.length, match?.selectedLocation, match?.state, matchId, autoBanLocationForBots]);

  // Auto-ban map for bots
  useEffect(() => {
    if (!match || match.state !== "VETO" || !match.selectedLocation || match.selectedMap) return;
    const mapPool = match.mapPool || [];
    const bannedMaps = match.bannedMaps || [];
    if (bannedMaps.length >= mapPool.length - 1) return;

    const timer = setTimeout(async () => {
      try {
        const result = await autoBanForBots({ matchId });
        if (result.success && result.bannedMap) {
          toast.info(`🤖 Bot baniu: ${result.bannedMap}`);
        }
      } catch (error) {
        // Silently fail
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [match?.bannedMaps?.length, match?.selectedMap, match?.selectedLocation, match?.state, matchId, autoBanForBots]);

  if (!match || !currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  const playerA = match.teamAPlayers?.[0];
  const playerB = match.teamBPlayers?.[0];
  const isPlayerA = currentUser._id === playerA?._id;
  const isPlayerB = currentUser._id === playerB?._id;

  const locationPool = match.locationPool || ["Frankfurt", "Paris", "Madrid"];
  const bannedLocations = match.bannedLocations || [];
  const selectedLocation = match.selectedLocation;

  const mapPool = match.mapPool || [];
  const bannedMaps = match.bannedMaps || [];
  const selectedMap = match.selectedMap;

  // Turn logic
  const locationBanCount = bannedLocations.length;
  const isLocationTeamATurn = locationBanCount % 2 === 0;
  const isLocationYourTurn = (isLocationTeamATurn && isPlayerA) || (!isLocationTeamATurn && isPlayerB);

  const mapBanCount = bannedMaps.length;
  const isMapTeamATurn = mapBanCount % 2 === 0;
  const isMapYourTurn = (isMapTeamATurn && isPlayerA) || (!isMapTeamATurn && isPlayerB);

  const currentTurnPlayer = !selectedLocation 
    ? (isLocationTeamATurn ? playerA : playerB)
    : !selectedMap 
    ? (isMapTeamATurn ? playerA : playerB)
    : null;

  const handleLocationBan = async (location: string) => {
    if (!isLocationYourTurn) {
      toast.error("Não é a tua vez!");
      return;
    }
    try {
      await banLocation({ matchId, location });
      toast.success(`${location} banido!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMapBan = async (mapName: string) => {
    if (!isMapYourTurn) {
      toast.error("Não é a tua vez!");
      return;
    }
    try {
      await banMap({ matchId, mapName });
      toast.success(`${mapName} banido!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyServerIP = () => {
    if (match.serverIp) {
      navigator.clipboard.writeText(`connect ${match.serverIp}`);
      setCopied(true);
      toast.success("Comando copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 flex">
      
      {/* LEFT PANEL - PLAYER A */}
      <div className={`w-[250px] border-r-4 ${isPlayerA && !selectedLocation && isLocationYourTurn ? 'border-orange-500' : isPlayerA && selectedLocation && !selectedMap && isMapYourTurn ? 'border-orange-500' : 'border-zinc-800'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <PlayerPanel 
          player={playerA} 
          isCurrentUser={isPlayerA}
          isTheirTurn={currentTurnPlayer?._id === playerA?._id}
          side="A"
        />
      </div>

      {/* CENTER - VETO ARENA */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <div className="h-20 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            {!selectedLocation ? (
              <>
                <div className="text-sm uppercase tracking-wider text-zinc-500 mb-1">VETO DE LOCALIZAÇÃO</div>
                <div className="text-lg font-bold text-zinc-100">
                  {currentTurnPlayer ? (
                    <>
                      <span className="text-orange-500">{currentTurnPlayer.displayName || "Jogador"}</span> a banir
                    </>
                  ) : "Aguardando..."}
                </div>
              </>
            ) : !selectedMap ? (
              <>
                <div className="text-sm uppercase tracking-wider text-zinc-500 mb-1">VETO DE MAPA</div>
                <div className="text-lg font-bold text-zinc-100">
                  {currentTurnPlayer ? (
                    <>
                      <span className="text-orange-500">{currentTurnPlayer.displayName || "Jogador"}</span> a banir
                    </>
                  ) : "Aguardando..."}
                </div>
              </>
            ) : match.state === "CONFIGURING" ? (
              <>
                <div className="text-sm uppercase tracking-wider text-orange-500 mb-1">⚙️ A PROVISIONAR SERVIDOR</div>
                <div className="text-lg font-bold text-zinc-100">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm uppercase tracking-wider text-green-500 mb-1">✅ SERVIDOR PRONTO</div>
                <div className="text-lg font-bold text-zinc-100">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          
          {/* STAGE 1: Location Veto */}
          {!selectedLocation && (
            <div className="flex flex-row justify-center gap-6">
              {LOCATIONS.map((loc) => {
                const isBanned = bannedLocations.includes(loc.id);
                const isSelected = selectedLocation === loc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationBan(loc.id)}
                    disabled={isBanned || isSelected || !isLocationYourTurn}
                    className={`
                      relative w-48 h-64 rounded-xl border-2 transition-all duration-300
                      ${isBanned ? 'opacity-20 grayscale scale-90 border-red-500' : 'border-zinc-700 hover:border-orange-500 hover:scale-105'}
                      ${!isLocationYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected ? 'border-green-500 ring-4 ring-green-500/50' : ''}
                      bg-zinc-800/50 backdrop-blur-sm overflow-hidden
                    `}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/50 to-zinc-900/90" />
                    <div className="relative h-full flex flex-col items-center justify-center p-6">
                      <div className="text-6xl mb-4">{loc.flag}</div>
                      <div className="text-2xl font-black text-zinc-100 uppercase">{loc.name}</div>
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <X className="w-24 h-24 text-red-500" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STAGE 2: Map Veto */}
          {selectedLocation && !selectedMap && (
            <div className="flex flex-row justify-center gap-4 flex-wrap max-w-5xl">
              {mapPool.map((map) => {
                const isBanned = bannedMaps.includes(map);
                const isSelected = selectedMap === map;
                return (
                  <button
                    key={map}
                    onClick={() => handleMapBan(map)}
                    disabled={isBanned || isSelected || !isMapYourTurn}
                    className={`
                      relative w-40 h-56 rounded-lg border-2 transition-all duration-300
                      ${isBanned ? 'opacity-20 grayscale scale-90 border-red-500' : 'border-zinc-700 hover:border-orange-500 hover:scale-105'}
                      ${!isMapYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected ? 'border-green-500 ring-4 ring-green-500/50' : ''}
                      overflow-hidden
                    `}
                  >
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${MAP_IMAGES[map] || MAP_IMAGES.aim_map})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
                    <div className="relative h-full flex flex-col justify-end p-3">
                      <div className="text-sm font-bold text-zinc-100 uppercase text-center">
                        {map.replace(/_/g, " ")}
                      </div>
                    </div>
                    {isBanned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <X className="w-16 h-16 text-red-500" strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* STAGE 3: Provisioning */}
          {selectedLocation && selectedMap && match.state === "CONFIGURING" && (
            <div className="text-center space-y-6">
              <Loader2 className="w-24 h-24 text-orange-500 animate-spin mx-auto" />
              <div>
                <div className="text-3xl font-black text-zinc-100 uppercase mb-2">
                  A Provisionar Servidor
                </div>
                <div className="text-lg text-zinc-400">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} em {selectedLocation}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: Ready */}
          {selectedLocation && selectedMap && match.state === "WARMUP" && match.serverIp && (
            <div className="text-center space-y-8">
              <div className="text-6xl mb-4">🎮</div>
              <div>
                <div className="text-3xl font-black text-green-500 uppercase mb-4">
                  Servidor Pronto!
                </div>
                <div className="text-lg text-zinc-400 mb-6">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                </div>
              </div>
              
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800 p-6 max-w-2xl mx-auto">
                <div className="text-sm uppercase tracking-wider text-zinc-500 mb-3">IP do Servidor</div>
                <code className="text-2xl font-mono text-orange-500 block mb-4">
                  connect {match.serverIp}
                </code>
                <Button
                  onClick={copyServerIP}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase"
                  size="lg"
                >
                  {copied ? (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      Copiar Comando
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-500 mt-4">
                  Cole este comando no console do CS2 (tecla ~)
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT PANEL - PLAYER B */}
      <div className={`w-[250px] border-l-4 ${isPlayerB && !selectedLocation && isLocationYourTurn ? 'border-orange-500' : isPlayerB && selectedLocation && !selectedMap && isMapYourTurn ? 'border-orange-500' : 'border-zinc-800'} bg-zinc-900/50 backdrop-blur-sm flex flex-col`}>
        <PlayerPanel 
          player={playerB} 
          isCurrentUser={isPlayerB}
          isTheirTurn={currentTurnPlayer?._id === playerB?._id}
          side="B"
        />
      </div>

    </div>
  );
}

// Player Panel Component
function PlayerPanel({ 
  player, 
  isCurrentUser, 
  isTheirTurn,
  side 
}: { 
  player: any; 
  isCurrentUser: boolean;
  isTheirTurn: boolean;
  side: "A" | "B";
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

  return (
    <div className="flex-1 flex flex-col p-6">
      
      {/* Turn Indicator */}
      {isTheirTurn && (
        <div className="mb-4 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-orange-500 uppercase">Vez de Banir</span>
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
        {isCurrentUser && (
          <div className="text-xs uppercase tracking-wider text-orange-500 font-bold">TU</div>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        {/* ELO */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-zinc-400 uppercase">ELO</span>
            </div>
            <span className="text-xl font-black text-orange-500">
              {player.elo_1v1 || 1000}
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-zinc-400 uppercase">Win Rate</span>
            </div>
            <span className="text-xl font-black text-green-500">
              {player.winRate ? `${player.winRate.toFixed(0)}%` : "0%"}
            </span>
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
