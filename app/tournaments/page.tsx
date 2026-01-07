"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Trophy, 
  Plus, 
  Users, 
  Calendar, 
  Coins,
  Clock,
  CheckCircle,
  Play,
  Lock
} from "lucide-react";

/**
 * FASE 51: TOURNAMENT LISTING PAGE
 * Cards com banners, estado, e prémios em destaque
 */

export default function TournamentsPage() {
  const router = useRouter();
  const tournaments = useQuery(api.tournaments.getAllTournaments);
  const canOrganize = useQuery(api.tournaments.canOrganize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return { text: "Rascunho", color: "bg-zinc-600", icon: Lock };
      case "REGISTRATION":
        return { text: "Inscrições Abertas", color: "bg-green-500", icon: CheckCircle };
      case "CHECKIN":
        return { text: "Check-in", color: "bg-yellow-500", icon: Clock };
      case "ONGOING":
        return { text: "A Decorrer", color: "bg-orange-500 animate-pulse", icon: Play };
      case "FINISHED":
        return { text: "Terminado", color: "bg-zinc-600", icon: Trophy };
      case "CANCELLED":
        return { text: "Cancelado", color: "bg-red-500", icon: Lock };
      default:
        return { text: status, color: "bg-zinc-600", icon: Trophy };
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPrizeDisplay = (tournament: any) => {
    if (tournament.prizeMode === "SOBERANAS" && tournament.prizePool) {
      return `${tournament.prizePool} Ⓢ`;
    }
    if (tournament.prize1st) {
      return tournament.prize1st;
    }
    return "Prémios a anunciar";
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                Torneios
              </h1>
              <p className="text-zinc-400 mt-1">Compete e conquista prémios</p>
            </div>
            
            {canOrganize && (
              <button
                onClick={() => router.push("/tournaments/create")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-bold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Criar Torneio
              </button>
            )}
          </div>

          {/* Tournament Grid */}
          {!tournaments ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sem torneios ativos</h3>
              <p className="text-zinc-500">Os próximos torneios aparecerão aqui</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {tournaments.map((tournament) => {
                const status = getStatusBadge(tournament.status);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={tournament._id}
                    onClick={() => router.push(`/tournaments/${tournament._id}`)}
                    className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:scale-[1.02] hover:-translate-y-1"
                  >
                    {/* Banner */}
                    <div className="h-32 bg-gradient-to-br from-orange-600/30 to-purple-600/30 relative">
                      {tournament.bannerUrl && (
                        <img 
                          src={tournament.bannerUrl} 
                          alt={tournament.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                      
                      {/* Status Badge */}
                      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.text}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                        {tournament.name}
                      </h3>

                      <div className="space-y-2 text-sm">
                        {/* Mode & Teams */}
                        <div className="flex items-center justify-between text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{tournament.mode} • {tournament.currentTeams || 0}/{tournament.maxTeams}</span>
                          </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(tournament.startDate)}</span>
                        </div>

                        {/* Prize */}
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-yellow-500" />
                          <span className="text-yellow-500 font-bold">{getPrizeDisplay(tournament)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors pointer-events-none" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
