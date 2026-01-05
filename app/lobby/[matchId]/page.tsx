"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Trophy, Copy, Loader2, X, Target, 
  TrendingUp, MapPin, Flame, Shield, Award,
  Zap, Clock, ChevronRight, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAP_IMAGES: Record<string, string> = {
  aim_map: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80",
  awp_lego_2: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80",
  aim_redline: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&q=80",
  fy_pool_day: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=600&q=80",
  aim_ag_texture_city_advanced: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600&q=80",
};

const LOCATIONS = [
  { id: "Frankfurt", name: "Frankfurt", flag: "🇩🇪", ping: "5ms", region: "Central EU" },
  { id: "Paris", name: "Paris", flag: "🇫🇷", ping: "12ms", region: "West EU" },
  { id: "Madrid", name: "Madrid", flag: "🇪🇸", ping: "18ms", region: "South EU" },
];

export default function LobbyV6() {
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

  // Auto-provision server when map is selected
  useEffect(() => {
    if (
      match?.state === "CONFIGURING" && 
      !match.serverIp && 
      !match.provisioningStarted && 
      !isProvisioning
    ) {
      setIsProvisioning(true);
      provisionServer({ matchId })
        .then(() => toast.success("Servidor provisionado!"))
        .catch((error) => toast.error("Erro ao provisionar servidor"))
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
      } catch (error) {}
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
      } catch (error) {}
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

  // Calculate veto progress
  const totalLocationBans = locationPool.length - 1;
  const totalMapBans = mapPool.length - 1;
  const locationProgress = selectedLocation ? 100 : (bannedLocations.length / totalLocationBans) * 100;
  const mapProgress = selectedLocation ? (selectedMap ? 100 : (bannedMaps.length / totalMapBans) * 100) : 0;
  const overallProgress = selectedLocation ? (selectedMap ? 100 : 50 + (mapProgress / 2)) : (locationProgress / 2);

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex">
        
        {/* LEFT - Player A Stats */}
        <div className="w-80 bg-zinc-900/30 backdrop-blur-sm border-r border-zinc-800 overflow-hidden">
          <EnhancedPlayerStats player={playerA} isCurrentUser={isPlayerA} side="A" />
        </div>

        {/* CENTER - Veto Arena */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-6 flex items-center justify-center">
            
            {/* STAGE 1: Location Veto */}
            {!selectedLocation && (
              <div className="w-full max-w-5xl">
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-black text-zinc-100 mb-2">Escolhe a Localização do Servidor</h2>
                  <p className="text-zinc-400">Bane as localizações indesejadas. A última restante será selecionada.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {LOCATIONS.map((loc) => {
                    const isBanned = bannedLocations.includes(loc.id);
                    const isSelected = selectedLocation === loc.id;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleLocationBan(loc.id)}
                        disabled={isBanned || isSelected || !isLocationYourTurn}
                        className={`
                          group relative h-52 rounded-2xl border-2 transition-all duration-300
                          ${isBanned ? 'opacity-30 grayscale scale-95 border-red-500/50' : 'border-zinc-700 hover:border-orange-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20'}
                          ${!isLocationYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                          ${isSelected ? 'border-green-500 ring-4 ring-green-500/50 scale-105' : ''}
                          bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 backdrop-blur-sm overflow-hidden
                        `}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/50 to-zinc-900/90" />
                        <div className="relative h-full flex flex-col items-center justify-center p-6">
                          <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">{loc.flag}</div>
                          <div className="text-3xl font-black text-zinc-100 uppercase mb-2">{loc.name}</div>
                          <div className="text-sm text-zinc-400 mb-3">{loc.region}</div>
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-green-500" />
                            <span className="font-bold text-green-500">{loc.ping}</span>
                          </div>
                        </div>
                        {isBanned && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="text-center">
                              <X className="w-24 h-24 text-red-500 mx-auto mb-2" strokeWidth={4} />
                              <span className="text-red-500 font-black uppercase text-lg">Banido</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE 2: Map Veto */}
            {selectedLocation && !selectedMap && (
              <div className="w-full max-w-6xl">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-3">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-bold text-green-500">{selectedLocation} Selecionado</span>
                  </div>
                  <h2 className="text-3xl font-black text-zinc-100 mb-2">Escolhe o Mapa</h2>
                  <p className="text-zinc-400">Bane os mapas indesejados. O último restante será selecionado.</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {mapPool.map((map) => {
                    const isBanned = bannedMaps.includes(map);
                    const isSelected = selectedMap === map;
                    return (
                      <button
                        key={map}
                        onClick={() => handleMapBan(map)}
                        disabled={isBanned || isSelected || !isMapYourTurn}
                        className={`
                          group relative h-64 rounded-2xl border-2 transition-all duration-300
                          ${isBanned ? 'opacity-30 grayscale scale-95 border-red-500/50' : 'border-zinc-700 hover:border-orange-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20'}
                          ${!isMapYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                          ${isSelected ? 'border-green-500 ring-4 ring-green-500/50 scale-105' : ''}
                          overflow-hidden
                        `}
                      >
                        <div 
                          className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                          style={{ backgroundImage: `url(${MAP_IMAGES[map] || MAP_IMAGES.aim_map})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90" />
                        <div className="relative h-full flex flex-col justify-end p-6">
                          <div className="text-2xl font-black text-zinc-100 uppercase text-center mb-2">
                            {map.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-zinc-400 text-center uppercase tracking-wider">1v1 Aim Map</div>
                        </div>
                        {isBanned && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                            <div className="text-center">
                              <X className="w-20 h-20 text-red-500 mx-auto mb-2" strokeWidth={4} />
                              <span className="text-red-500 font-black uppercase">Banido</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STAGE 3: Provisioning */}
            {selectedLocation && selectedMap && match.state === "CONFIGURING" && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-8">
                  <Loader2 className="w-32 h-32 text-orange-500 animate-spin mx-auto" />
                  <div>
                    <div className="text-5xl font-black text-zinc-100 uppercase mb-4">
                      A Provisionar Servidor
                    </div>
                    <div className="text-2xl text-zinc-400 mb-2">
                      {selectedMap.replace(/_/g, " ").toUpperCase()}
                    </div>
                    <div className="text-xl text-zinc-500">
                      {selectedLocation} • Aguarda...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4: Ready */}
            {selectedLocation && selectedMap && match.state === "WARMUP" && match.serverIp && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-8 max-w-3xl">
                  <div className="text-7xl mb-6">🎮</div>
                  <div>
                    <div className="text-5xl font-black text-green-500 uppercase mb-4 flex items-center justify-center gap-4">
                      <Zap className="w-12 h-12" />
                      Servidor Pronto!
                    </div>
                    <div className="text-2xl text-zinc-400 mb-2">
                      {selectedMap.replace(/_/g, " ").toUpperCase()}
                    </div>
                    <div className="text-xl text-zinc-500">
                      {selectedLocation}
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8 space-y-6">
                    <div className="text-sm uppercase tracking-wider text-zinc-500 mb-3">IP do Servidor</div>
                    <code className="text-3xl font-mono text-orange-500 block mb-6 bg-zinc-950 py-6 px-8 rounded-xl border border-zinc-800">
                      connect {match.serverIp}
                    </code>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        onClick={copyServerIP}
                        className="h-16 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase text-lg"
                      >
                        {copied ? (
                          <>
                            <Copy className="w-6 h-6 mr-2" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-6 h-6 mr-2" />
                            Copiar Comando
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => router.push(`/match/${matchId}/live`)}
                        className="h-16 bg-green-600 hover:bg-green-500 text-white font-bold uppercase text-lg"
                      >
                        <Trophy className="w-6 h-6 mr-2" />
                        Ver Jogo Ao Vivo
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT - Player B Stats */}
        <div className="w-80 bg-zinc-900/30 backdrop-blur-sm border-l border-zinc-800 overflow-hidden">
          <EnhancedPlayerStats player={playerB} isCurrentUser={isPlayerB} side="B" />
        </div>
    </div>
  );
}

// Enhanced Player Stats Component with Charts & Info
function EnhancedPlayerStats({ 
  player, 
  isCurrentUser, 
  side 
}: { 
  player: any; 
  isCurrentUser: boolean;
  side: "A" | "B";
}) {
  if (!player) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-zinc-600 animate-spin mx-auto mb-4" />
          <div className="text-sm text-zinc-500">Aguardando jogador...</div>
        </div>
      </div>
    );
  }

  const stats = player.stats || { totalMatches: 0, wins: 0, losses: 0, winRate: 0 };
  const winRate = stats.winRate || 0;
  const elo = player.elo_1v1 || 1000;
  
  // Calculate level based on ELO
  const level = Math.floor((elo - 1000) / 100) + 1;
  const levelProgress = ((elo - 1000) % 100);

  return (
    <div className="p-6 space-y-6">
      
      {/* Player Header */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className={`w-32 h-32 rounded-2xl border-4 ${isCurrentUser ? 'border-orange-500 shadow-lg shadow-orange-500/30' : 'border-zinc-700'} bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center overflow-hidden`}>
            {player.steamAvatar || player.avatarUrl ? (
              <img src={player.steamAvatar || player.avatarUrl} alt={player.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-black text-zinc-600">
                {(player.displayName || player.steamName || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          {isCurrentUser && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-black uppercase px-4 py-1 rounded-full">
              TU
            </div>
          )}
        </div>
        
        <div className="text-2xl font-black text-zinc-100 mb-1">
          {player.displayName || player.steamName || "Jogador"}
        </div>
        
        {/* Level Badge */}
        <div className="inline-flex items-center gap-2 bg-zinc-800/50 rounded-full px-4 py-2 mb-4">
          <Award className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-zinc-100">Nível {level}</span>
        </div>
      </div>

      {/* ELO */}
      <div className="bg-gradient-to-r from-orange-600/10 to-orange-500/10 border border-orange-600/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            <span className="text-xs text-zinc-400 uppercase font-bold">ELO Rating</span>
          </div>
          <span className="text-3xl font-black text-orange-500">{elo}</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-1">{levelProgress}% para Nível {level + 1}</div>
      </div>

      {/* Win Rate Chart */}
      <div className="bg-zinc-800/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-green-500" />
          <span className="text-xs text-zinc-400 uppercase font-bold">Win Rate</span>
        </div>
        <div className="relative w-32 h-32 mx-auto mb-3">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-zinc-800"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 56}`}
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - winRate / 100)}`}
              className="text-green-500 transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-black text-green-500">{winRate.toFixed(0)}%</div>
              <div className="text-xs text-zinc-500">Taxa de Vitória</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="text-xl font-black text-green-500">{stats.wins || 0}</div>
            <div className="text-xs text-zinc-500">Vitórias</div>
          </div>
          <div>
            <div className="text-xl font-black text-red-500">{stats.losses || 0}</div>
            <div className="text-xs text-zinc-500">Derrotas</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        <div className="bg-zinc-800/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 uppercase">Partidas</span>
            <span className="text-lg font-black text-zinc-100">{stats.totalMatches || 0}</span>
          </div>
        </div>
        
        {player.isBanned && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-red-500" />
              <span className="text-xs text-red-500 uppercase font-bold">Banido</span>
            </div>
          </div>
        )}
      </div>

      {/* Side Badge */}
      <div className={`text-center py-4 rounded-xl font-black text-xl uppercase border-2 ${
        side === "A" 
          ? "bg-blue-500/20 text-blue-500 border-blue-500/50" 
          : "bg-red-500/20 text-red-500 border-red-500/50"
      }`}>
        {side === "A" ? (
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-6 h-6" />
            CT SIDE
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-6 h-6" />
            T SIDE
          </div>
        )}
      </div>

    </div>
  );
}
