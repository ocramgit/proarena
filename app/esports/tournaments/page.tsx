"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { 
  Trophy,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  Loader2,
  Gamepad2
} from "lucide-react";

/**
 * FASE 54 REFACTOR: TOURNAMENTS PAGE (Within Esports Hub)
 * Shows tournaments with org registration context
 */

export default function TournamentsPage() {
  const tournaments = useQuery(api.tournaments.getAllTournaments);
  const myOrg = useQuery(api.organizations.getMyOrganization);

  const formatDate = (timestamp: bigint | number) => {
    return new Date(Number(timestamp)).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      REGISTRATION: { bg: "bg-green-500/20", text: "text-green-400", label: "Inscrições Abertas" },
      CHECKIN: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Check-in" },
      ONGOING: { bg: "bg-red-500/20", text: "text-red-400", label: "A Decorrer" },
      FINISHED: { bg: "bg-zinc-500/20", text: "text-zinc-400", label: "Terminado" },
      DRAFT: { bg: "bg-zinc-800", text: "text-zinc-500", label: "Rascunho" },
    };
    const style = styles[status] || styles.DRAFT;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  if (tournaments === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Trophy className="w-7 h-7 text-yellow-500" />
            Torneios
          </h1>
          <p className="text-zinc-400 mt-1">Compete com a tua organização</p>
        </div>

        {myOrg && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <span className="text-sm text-zinc-400">A jogar como:</span>
            <span className="font-bold text-white">[{myOrg.tag}] {myOrg.name}</span>
          </div>
        )}
      </div>

      {/* No Org Warning */}
      {!myOrg && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-400">
            <strong>Nota:</strong> Para participar em torneios, precisas de ter uma organização.{" "}
            <Link href="/esports/org" className="underline hover:text-yellow-300">
              Criar ou juntar-te a uma org
            </Link>
          </p>
        </div>
      )}

      {/* Tournament Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments?.map((tournament: any) => (
          <Link
            key={tournament._id}
            href={`/tournaments/${tournament._id}`}
            className="flex flex-col p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group"
          >
            {/* Banner */}
            <div className="h-24 rounded-lg bg-gradient-to-br from-orange-600/30 to-zinc-900 mb-4 overflow-hidden">
              {tournament.bannerUrl && (
                <img 
                  src={tournament.bannerUrl} 
                  alt=""
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(tournament.status)}
              <span className="text-xs text-zinc-500">{tournament.mode}</span>
            </div>

            <h3 className="font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
              {tournament.name}
            </h3>

            <div className="mt-3 space-y-1.5 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(tournament.startDate)}
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {tournament.currentTeams || 0}/{tournament.maxTeams} equipas
              </div>
              {tournament.prizePool && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-400">{tournament.prizePool} Soberanas</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between">
              <span className="text-xs text-zinc-600">
                {tournament.prize1st || "Prémios a anunciar"}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 transition-colors" />
            </div>
          </Link>
        ))}

        {(!tournaments || tournaments.length === 0) && (
          <div className="col-span-full text-center py-12">
            <Gamepad2 className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Sem torneios disponíveis</p>
            <p className="text-zinc-600 text-sm mt-1">Novos torneios em breve!</p>
          </div>
        )}
      </div>

      {/* Link to main tournaments */}
      <div className="mt-8 text-center">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Ver página completa de torneios
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
