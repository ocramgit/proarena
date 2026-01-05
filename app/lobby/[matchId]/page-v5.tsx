"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Trophy, Copy, Loader2, Swords, X, Target, 
  TrendingUp, TrendingDown, Clock, MapPin, Zap,
  Shield, Flame, Award, ChevronRight, Timer
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
  { id: "Frankfurt", name: "Frankfurt", flag: "🇩🇪", ping: "5ms" },
  { id: "Paris", name: "Paris", flag: "🇫🇷", ping: "12ms" },
  { id: "Madrid", name: "Madrid", flag: "🇪🇸", ping: "18ms" },
];

export default function LobbyV5() {
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
  const [countdown, setCountdown] = useState(30);

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

  // Countdown timer when server is ready
  useEffect(() => {
    if (match?.state === "WARMUP" && match.serverIp) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [match?.state, match?.serverIp]);

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
  const locationProgress = (bannedLocations.length / totalLocationBans) * 100;
  const mapProgress = selectedLocation ? (bannedMaps.length / totalMapBans) * 100 : 0;

  return (
    <div className="h-screen w-full overflow-hidden bg-zinc-950 flex">
      
      {/* LEFT PANEL - PLAYER A - ENHANCED */}
      <div className={`w-[320px] border-r-4 ${isPlayerA && !selectedLocation && isLocationYourTurn ? 'border-orange-500 animate-pulse' : isPlayerA && selectedLocation && !selectedMap && isMapYourTurn ? 'border-orange-500 animate-pulse' : 'border-zinc-800'} bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col`}>
        <EnhancedPlayerPanel 
          player={playerA} 
          isCurrentUser={isPlayerA}
          isTheirTurn={currentTurnPlayer?._id === playerA?._id}
          side="A"
        />
      </div>

      {/* CENTER - VETO ARENA WITH PROGRESS */}
      <div className="flex-1 flex flex-col">
        
        {/* Enhanced Header with Progress */}
        <div className="h-24 border-b border-zinc-800 bg-zinc-900/30 backdrop-blur-sm">
          <div className="h-full flex flex-col justify-center px-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-center flex-1">
                {!selectedLocation ? (
                  <>
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">FASE 1: VETO DE LOCALIZAÇÃO</div>
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
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">FASE 2: VETO DE MAPA</div>
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
                    <div className="text-xs uppercase tracking-wider text-orange-500 mb-1">⚙️ FASE 3: A PROVISIONAR SERVIDOR</div>
                    <div className="text-lg font-bold text-zinc-100">
                      {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-wider text-green-500 mb-1 flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      SERVIDOR PRONTO
                    </div>
                    <div className="text-lg font-bold text-zinc-100">
                      {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-600 to-orange-500 transition-all duration-500"
                style={{ 
                  width: !selectedLocation 
                    ? `${locationProgress}%` 
                    : !selectedMap 
                    ? `${50 + (mapProgress / 2)}%`
                    : '100%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          
          {/* STAGE 1: Location Veto */}
          {!selectedLocation && (
            <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-black text-zinc-100 mb-2">ESCOLHE A LOCALIZAÇÃO</h2>
                <p className="text-zinc-400">Bane as localizações indesejadas. A última será selecionada.</p>
              </div>
              <div className="flex flex-row justify-center gap-8">
                {LOCATIONS.map((loc) => {
                  const isBanned = bannedLocations.includes(loc.id);
                  const isSelected = selectedLocation === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationBan(loc.id)}
                      disabled={isBanned || isSelected || !isLocationYourTurn}
                      className={`
                        group relative w-56 h-80 rounded-2xl border-2 transition-all duration-300
                        ${isBanned ? 'opacity-20 grayscale scale-90 border-red-500' : 'border-zinc-700 hover:border-orange-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20'}
                        ${!isLocationYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                        ${isSelected ? 'border-green-500 ring-4 ring-green-500/50' : ''}
                        bg-zinc-800/50 backdrop-blur-sm overflow-hidden
                      `}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/50 to-zinc-900/90" />
                      <div className="relative h-full flex flex-col items-center justify-center p-6">
                        <div className="text-8xl mb-6 group-hover:scale-110 transition-transform">{loc.flag}</div>
                        <div className="text-3xl font-black text-zinc-100 uppercase mb-2">{loc.name}</div>
                        <div className="flex items-center gap-2 text-sm text-green-500">
                          <Zap className="w-4 h-4" />
                          <span className="font-bold">{loc.ping}</span>
                        </div>
                        {isBanned && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <X className="w-32 h-32 text-red-500" strokeWidth={4} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 2: Map Veto */}
          {selectedLocation && !selectedMap && (
            <div className="flex flex-col items-center gap-6 w-full max-w-6xl">
              <div className="text-center mb-4">
                <h2 className="text-3xl font-black text-zinc-100 mb-2">ESCOLHE O MAPA</h2>
                <p className="text-zinc-400">Bane os mapas indesejados. O último será selecionado.</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {mapPool.map((map) => {
                  const isBanned = bannedMaps.includes(map);
                  const isSelected = selectedMap === map;
                  return (
                    <button
                      key={map}
                      onClick={() => handleMapBan(map)}
                      disabled={isBanned || isSelected || !isMapYourTurn}
                      className={`
                        group relative w-64 h-80 rounded-xl border-2 transition-all duration-300
                        ${isBanned ? 'opacity-20 grayscale scale-90 border-red-500' : 'border-zinc-700 hover:border-orange-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20'}
                        ${!isMapYourTurn ? 'cursor-not-allowed' : 'cursor-pointer'}
                        ${isSelected ? 'border-green-500 ring-4 ring-green-500/50' : ''}
                        overflow-hidden
                      `}
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                        style={{ backgroundImage: `url(${MAP_IMAGES[map] || MAP_IMAGES.aim_map})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/90" />
                      <div className="relative h-full flex flex-col justify-end p-4">
                        <div className="text-xl font-bold text-zinc-100 uppercase text-center mb-2">
                          {map.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-zinc-400 text-center">1v1 AIM MAP</div>
                      </div>
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <X className="w-24 h-24 text-red-500" strokeWidth={4} />
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
            <div className="text-center space-y-6">
              <Loader2 className="w-32 h-32 text-orange-500 animate-spin mx-auto" />
              <div>
                <div className="text-4xl font-black text-zinc-100 uppercase mb-2">
                  A Provisionar Servidor
                </div>
                <div className="text-xl text-zinc-400">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} em {selectedLocation}
                </div>
                <div className="text-sm text-zinc-500 mt-4">
                  Aguarda enquanto criamos o teu servidor dedicado...
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: Ready with COUNTDOWN */}
          {selectedLocation && selectedMap && match.state === "WARMUP" && match.serverIp && (
            <div className="text-center space-y-8 max-w-3xl">
              
              {/* Countdown Circle */}
              <div className="relative w-48 h-48 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-zinc-800"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - countdown / 30)}`}
                    className="text-orange-500 transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Timer className="w-8 h-8 text-orange-500 mb-2" />
                  <div className="text-5xl font-black text-orange-500">{countdown}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">segundos</div>
                </div>
              </div>

              <div>
                <div className="text-4xl font-black text-green-500 uppercase mb-4 flex items-center justify-center gap-3">
                  <Zap className="w-10 h-10" />
                  Servidor Pronto!
                </div>
                <div className="text-xl text-zinc-400 mb-6">
                  {selectedMap.replace(/_/g, " ").toUpperCase()} • {selectedLocation}
                </div>
              </div>
              
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800 p-8 space-y-6">
                <div className="text-sm uppercase tracking-wider text-zinc-500 mb-3">IP do Servidor</div>
                <code className="text-3xl font-mono text-orange-500 block mb-6 bg-zinc-950 py-4 px-6 rounded-lg border border-zinc-800">
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
                
                <p className="text-xs text-zinc-500 mt-4">
                  Cola o comando no console do CS2 (tecla ~) e entra no servidor
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT PANEL - PLAYER B - ENHANCED */}
      <div className={`w-[320px] border-l-4 ${isPlayerB && !selectedLocation && isLocationYourTurn ? 'border-orange-500 animate-pulse' : isPlayerB && selectedLocation && !selectedMap && isMapYourTurn ? 'border-orange-500 animate-pulse' : 'border-zinc-800'} bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col`}>
        <EnhancedPlayerPanel 
          player={playerB} 
          isCurrentUser={isPlayerB}
          isTheirTurn={currentTurnPlayer?._id === playerB?._id}
          side="B"
        />
      </div>

    </div>
  );
}

// ENHANCED Player Panel Component with MORE INFO
function EnhancedPlayerPanel({ 
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

  const stats = player.stats || { totalMatches: 0, wins: 0, losses: 0, winRate: 0 };
  const recentForm = ["W", "W", "L", "W", "L"]; // Mock data - replace with real

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      
      {/* Turn Indicator - ENHANCED */}
      {isTheirTurn && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-2 border-orange-500 rounded-full px-6 py-3 shadow-lg shadow-orange-500/20">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-black text-orange-500 uppercase tracking-wider">A Tua Vez!</span>
          </div>
        </div>
      )}

      {/* Avatar - LARGER */}
      <div className="relative">
        <div className={`w-40 h-40 mx-auto rounded-2xl border-4 ${isCurrentUser ? 'border-orange-500 shadow-lg shadow-orange-500/30' : 'border-zinc-700'} bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center overflow-hidden`}>
          {player.steamAvatar || player.avatarUrl ? (
            <img src={player.steamAvatar || player.avatarUrl} alt={player.displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl font-black text-zinc-600">
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

      {/* Name & Steam */}
      <div className="text-center space-y-1">
        <div className="text-2xl font-black text-zinc-100">
          {player.displayName || player.steamName || player.clerkId?.substring(0, 10) || "Jogador"}
        </div>
        {player.steamName && (
          <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" className="w-3 h-3" alt="Steam" />
            {player.steamName}
          </div>
        )}
      </div>

      {/* Stats Grid - ENHANCED */}
      <div className="space-y-3">
        {/* ELO */}
        <div className="bg-gradient-to-r from-orange-600/10 to-orange-500/10 border border-orange-600/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" />
              <span className="text-xs text-zinc-400 uppercase font-bold">ELO Rating</span>
            </div>
            <span className="text-3xl font-black text-orange-500">
              {player.elo_1v1 || 1000}
            </span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-r from-green-600/10 to-emerald-500/10 border border-green-600/30 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              <span className="text-xs text-zinc-400 uppercase font-bold">Win Rate</span>
            </div>
            <span className="text-3xl font-black text-green-500">
              {stats.winRate ? `${stats.winRate.toFixed(0)}%` : "0%"}
            </span>
          </div>
        </div>

        {/* Matches */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-zinc-100">{stats.totalMatches || 0}</div>
            <div className="text-xs text-zinc-500 uppercase">Partidas</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-black text-green-500">{stats.wins || 0}</div>
            <div className="text-xs text-zinc-500 uppercase">Vitórias</div>
          </div>
        </div>
      </div>

      {/* Recent Form */}
      <div className="bg-zinc-800/30 rounded-lg p-4">
        <div className="text-xs text-zinc-500 uppercase font-bold mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Forma Recente
        </div>
        <div className="flex gap-2 justify-center">
          {recentForm.map((result, i) => (
            <div 
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                result === "W" 
                  ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                  : "bg-red-500/20 text-red-500 border border-red-500/50"
              }`}
            >
              {result}
            </div>
          ))}
        </div>
      </div>

      {/* Side Badge - ENHANCED */}
      <div className="mt-auto">
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

    </div>
  );
}
