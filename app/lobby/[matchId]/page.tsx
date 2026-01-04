"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Wifi, Copy, Check, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare } from "lucide-react";

const LOCATIONS = [
  { id: "frankfurt", name: "Frankfurt", flag: "🇩🇪", region: "Central Europe" },
  { id: "paris", name: "Paris", flag: "🇫🇷", region: "Western Europe" },
  { id: "madrid", name: "Madrid", flag: "🇪🇸", region: "Southern Europe" },
];

const MAP_IMAGES: Record<string, string> = {
  mirage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
  dust2: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
  inferno: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&q=80",
  nuke: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&q=80",
  overpass: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
  vertigo: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  ancient: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80",
};

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as Id<"matches">;

  const match = useQuery(api.matches.getMatchById, { matchId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const banLocation = useMutation(api.lobbyLocation.banLocation);
  const banMap = useMutation(api.lobby.banMap);
  const provisionServer = useAction(api.lobbyDatHost.provisionDatHostServer);

  const [copied, setCopied] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Auto-redirect based on match state
  useEffect(() => {
    if (match?.state === "LIVE") {
      console.log("🎮 Match is LIVE, redirecting to live page...");
      router.replace(`/match/${matchId}/live`);
    } else if (match?.state === "FINISHED") {
      console.log("🏁 Match is FINISHED, redirecting to results page...");
      router.replace(`/matches/${matchId}/result`);
    }
  }, [match?.state, matchId, router]);

  // Auto-provision server when map is selected
  useEffect(() => {
    if (match?.state === "CONFIGURING" && !match.serverIp && !isProvisioning) {
      console.log("🚀 Auto-provisioning server...");
      setIsProvisioning(true);
      provisionServer({ matchId })
        .then(() => {
          console.log("✅ Server provisioned successfully");
          toast.success("Servidor provisionado!");
        })
        .catch((error) => {
          console.error("❌ Failed to provision server:", error);
          toast.error("Erro ao provisionar servidor");
        })
        .finally(() => {
          setIsProvisioning(false);
        });
    }
  }, [match?.state, match?.serverIp, matchId, provisionServer, isProvisioning]);

  if (!match || !currentUser) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  const isInTeamA = match.teamA.includes(currentUser._id);
  const isInTeamB = match.teamB.includes(currentUser._id);
  const userTeam = isInTeamA ? "A" : isInTeamB ? "B" : null;

  const locationPool = match.locationPool || ["frankfurt", "paris", "madrid"];
  const bannedLocations = match.bannedLocations || [];
  const selectedLocation = match.selectedLocation;

  const locationBanCount = bannedLocations.length;
  const isLocationTeamATurn = locationBanCount % 2 === 0;
  const isLocationYourTurn = userTeam && ((isLocationTeamATurn && userTeam === "A") || (!isLocationTeamATurn && userTeam === "B"));

  const mapBanCount = match.bannedMaps.length;
  const isMapTeamATurn = mapBanCount % 2 === 0;
  const isMapYourTurn = userTeam && ((isMapTeamATurn && userTeam === "A") || (!isMapTeamATurn && userTeam === "B"));

  const remainingMaps = match.mapPool.filter((map) => !match.bannedMaps.includes(map));

  const handleLocationBan = async (location: string) => {
    if (!isLocationYourTurn) {
      toast.error("Não é a tua vez de banir!");
      return;
    }

    try {
      await banLocation({ matchId, location });
      toast.success(`${location.toUpperCase()} banido!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMapBan = async (mapName: string) => {
    if (!isMapYourTurn) {
      toast.error("Não é a tua vez de banir!");
      return;
    }

    try {
      const result = await banMap({ matchId, mapName });
      toast.success(`${mapName.toUpperCase()} banido!`);
      
      if (result.autoProvision) {
        console.log("🚀 Final map selected, auto-provisioning will trigger...");
      }
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

  // Phase 1: Location Veto (only if location not selected)
  if (match.state === "VETO" && !selectedLocation) {
    return (
      <div className="h-screen bg-zinc-950 overflow-hidden relative">
        {/* Background with blur */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80')" }}
        />
        
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-wider">
                    SELEÇÃO DE SERVIDOR
                  </h1>
                  <p className="text-zinc-400 mt-1">
                    Capitães, escolham a localização do servidor
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-500">VEZ DE</div>
                  <div className="text-2xl font-bold text-orange-500">
                    TEAM {isLocationTeamATurn ? "A" : "B"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Cards */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="grid grid-cols-3 gap-8 max-w-6xl w-full">
              {LOCATIONS.map((location) => {
                const isBanned = bannedLocations.includes(location.id);
                const canBan = !isBanned && isLocationYourTurn;

                return (
                  <button
                    key={location.id}
                    onClick={() => canBan && handleLocationBan(location.id)}
                    disabled={isBanned || !canBan}
                    className={`
                      relative group h-80 rounded-xl overflow-hidden transition-all duration-300
                      ${isBanned 
                        ? "opacity-30 scale-90 cursor-not-allowed" 
                        : canBan
                        ? "hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                      }
                      ${!isBanned && "border-2 border-zinc-800 hover:border-orange-500"}
                    `}
                  >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
                      <div className="text-8xl mb-4">{location.flag}</div>
                      <h3 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
                        {location.name}
                      </h3>
                      <p className="text-zinc-400 text-sm">{location.region}</p>
                      
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-950/80">
                          <div className="text-6xl font-black text-red-500 rotate-12">
                            BANIDO
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hover effect */}
                    {canBan && !isBanned && (
                      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-all duration-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer info */}
          <div className="p-6 border-t border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
              <div className="text-zinc-500">
                {bannedLocations.length} / {locationPool.length - 1} localizações banidas
              </div>
              <div className={`font-bold ${isLocationYourTurn ? "text-orange-500" : "text-zinc-500"}`}>
                {isLocationYourTurn ? "É A TUA VEZ!" : "Aguarda a tua vez..."}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-500 shadow-lg"
              size="icon"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-96 bg-zinc-900 border-zinc-800">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-4">Chat do Lobby</h3>
              <p className="text-zinc-400 text-sm">Chat em desenvolvimento...</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Phase 2: Map Veto (after location selected)
  if (match.state === "VETO" && selectedLocation && remainingMaps.length > 1) {
    return (
      <div className="h-screen bg-zinc-950 overflow-hidden relative">
        {/* Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
          style={{ backgroundImage: `url(${MAP_IMAGES[remainingMaps[0]] || MAP_IMAGES.mirage})` }}
        />
        
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="h-6 w-6 text-green-500" />
                    <span className="text-green-500 font-bold">
                      {LOCATIONS.find(l => l.id === selectedLocation)?.name} {LOCATIONS.find(l => l.id === selectedLocation)?.flag}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-wider">
                    VETO DE MAPAS
                  </h1>
                  <p className="text-zinc-400 mt-1">
                    Capitães, banir mapas alternadamente
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-500">VEZ DE</div>
                  <div className="text-2xl font-bold text-orange-500">
                    TEAM {isMapTeamATurn ? "A" : "B"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Carousel */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex gap-6 overflow-x-auto max-w-7xl pb-4">
              {match.mapPool.map((map) => {
                const isBanned = match.bannedMaps.includes(map);
                const canBan = !isBanned && isMapYourTurn;

                return (
                  <button
                    key={map}
                    onClick={() => canBan && handleMapBan(map)}
                    disabled={isBanned || !canBan}
                    className={`
                      relative group flex-shrink-0 w-80 h-96 rounded-xl overflow-hidden transition-all duration-300
                      ${isBanned 
                        ? "opacity-20 scale-75" 
                        : canBan
                        ? "hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50"
                        : "opacity-60"
                      }
                      ${!isBanned && "border-2 border-zinc-800 hover:border-orange-500"}
                    `}
                  >
                    {/* Map image */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${MAP_IMAGES[map] || MAP_IMAGES.mirage})` }}
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    
                    {/* Content */}
                    <div className="relative z-10 h-full flex flex-col justify-end p-6">
                      <h3 className="text-4xl font-black text-white uppercase tracking-wider">
                        {map}
                      </h3>
                      
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-950/90">
                          <div className="text-6xl font-black text-red-500 rotate-12">
                            BANIDO
                          </div>
                        </div>
                      )}
                    </div>

                    {canBan && !isBanned && (
                      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-all" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
              <div className="text-zinc-500">
                {match.bannedMaps.length} / {match.mapPool.length - 1} mapas banidos • {remainingMaps.length} restantes
              </div>
              <div className={`font-bold ${isMapYourTurn ? "text-orange-500" : "text-zinc-500"}`}>
                {isMapYourTurn ? "É A TUA VEZ!" : "Aguarda a tua vez..."}
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-500 shadow-lg"
              size="icon"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-96 bg-zinc-900 border-zinc-800">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-4">Chat do Lobby</h3>
              <p className="text-zinc-400 text-sm">Chat em desenvolvimento...</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Phase 3: Server Provisioning / Warmup
  return (
    <div className="h-screen bg-zinc-950 overflow-hidden relative">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
        style={{ backgroundImage: `url(${MAP_IMAGES[match.selectedMap || "mirage"]})` }}
      />
      
      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-8">
          <div className="bg-zinc-900/90 backdrop-blur-xl rounded-2xl border-2 border-zinc-800 p-12 text-center">
            {/* Map Selected */}
            <div className="mb-8">
              <Trophy className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-4xl font-black text-white uppercase tracking-wider mb-2">
                {match.selectedMap}
              </h2>
              <p className="text-zinc-400">
                {LOCATIONS.find(l => l.id === selectedLocation)?.name} {LOCATIONS.find(l => l.id === selectedLocation)?.flag}
              </p>
            </div>

            {/* Server Status */}
            {isProvisioning || (match.state === "CONFIGURING" && !match.serverIp) ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto" />
                <p className="text-xl font-bold text-orange-500 uppercase">
                  A PROVISIONAR SERVIDOR EM {LOCATIONS.find(l => l.id === selectedLocation)?.name?.toUpperCase()}...
                </p>
                <p className="text-zinc-500 text-sm">
                  Isto pode demorar alguns segundos
                </p>
              </div>
            ) : match.serverIp ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2 text-green-500">
                  <Wifi className="h-6 w-6" />
                  <span className="font-bold">SERVIDOR PRONTO</span>
                </div>

                {/* Server IP */}
                <div className="bg-zinc-950 rounded-lg p-6 border border-zinc-800">
                  <p className="text-zinc-500 text-sm mb-2">COMANDO DE CONEXÃO</p>
                  <code className="text-orange-500 font-mono text-lg break-all">
                    connect {match.serverIp}
                  </code>
                </div>

                {/* Copy Button */}
                <Button
                  onClick={copyServerIP}
                  className="w-full h-14 bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      COPIADO!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-5 w-5" />
                      COPIAR COMANDO
                    </>
                  )}
                </Button>

                <p className="text-zinc-400 text-sm">
                  {match.state === "WARMUP" 
                    ? "Aguardando jogadores conectarem..." 
                    : "Cola este comando na consola do CS2"}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
