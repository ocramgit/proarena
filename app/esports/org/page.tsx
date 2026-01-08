"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { 
  Building2, 
  Plus, 
  Users, 
  Trophy,
  Settings,
  CheckCircle,
  Crown,
  UserPlus,
  Loader2,
  ChevronRight,
  BarChart3,
  AlertCircle,
  Calendar,
  BookOpen,
  Layers,
  Award
} from "lucide-react";

/**
 * FASE 54 REFACTOR: MY ORG PAGE (Within Esports Hub)
 */

export default function MyOrgPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const invites = useQuery(api.organizations.getMyInvites);

  // Loading state
  if (myOrg === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Has org - show dashboard
  if (myOrg) {
    return <OrgDashboard orgId={myOrg._id as Id<"organizations">} role={myOrg.role} />;
  }

  // No org - show options
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <Building2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">A Tua Organização</h1>
        <p className="text-zinc-400">Ainda não fazes parte de nenhuma organização</p>
      </div>

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Convites Pendentes</h2>
          <div className="space-y-3">
            {invites.map((invite: any) => (
              <InviteCard key={invite._id} invite={invite} />
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/esports/org/create"
          className="p-6 rounded-xl bg-gradient-to-br from-orange-600/20 to-zinc-900 border border-orange-500/30 hover:border-orange-500/50 transition-colors group"
        >
          <Plus className="w-10 h-10 text-orange-500 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-bold text-white mb-2">Criar Organização</h3>
          <p className="text-zinc-400 text-sm">
            Cria a tua própria org e começa a construir a tua equipa
          </p>
        </Link>

        <Link
          href="/esports/rankings"
          className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
        >
          <Users className="w-10 h-10 text-zinc-600 mb-4 group-hover:text-zinc-500 transition-colors" />
          <h3 className="text-xl font-bold text-white mb-2">Explorar Equipas</h3>
          <p className="text-zinc-400 text-sm">
            Descobre organizações e encontra a tua equipa
          </p>
        </Link>
      </div>
    </div>
  );
}

function InviteCard({ invite }: { invite: any }) {
  const respondToInvite = useMutation(api.organizations.respondToInvite);
  const [isLoading, setIsLoading] = useState(false);

  const handleRespond = async (accept: boolean) => {
    setIsLoading(true);
    try {
      await respondToInvite({ inviteId: invite._id, accept });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-3">
        {invite.org?.logoUrl ? (
          <img src={invite.org.logoUrl} alt="" className="w-12 h-12 rounded-lg" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <span className="text-sm font-black text-white">{invite.org?.tag}</span>
          </div>
        )}
        <div>
          <p className="font-bold text-white">{invite.org?.name}</p>
          <p className="text-sm text-zinc-500">Convidado como {invite.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleRespond(false)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          Recusar
        </button>
        <button
          onClick={() => handleRespond(true)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceitar"}
        </button>
      </div>
    </div>
  );
}

function OrgDashboard({ orgId, role }: { orgId: Id<"organizations">; role: string }) {
  const org = useQuery(api.organizations.getOrganization, { orgId });
  const canManage = role === "OWNER" || role === "MANAGER";

  if (!org) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Org Header */}
      <div className="relative rounded-2xl overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-zinc-900 to-zinc-800">
          {org.bannerUrl && (
            <img src={org.bannerUrl} alt="" className="w-full h-full object-cover opacity-60" />
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 to-transparent">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl bg-zinc-900 border-4 border-zinc-950 overflow-hidden -mb-2">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
                  <span className="text-xl font-black text-white">{org.tag}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{org.name}</h1>
                {org.isVerified && <CheckCircle className="w-5 h-5 text-blue-500" />}
              </div>
              <p className="text-zinc-400">[{org.tag}] • {role}</p>
            </div>
            {canManage && (
              <Link
                href={`/esports/org/settings`}
                className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm text-zinc-500 mb-1">Ranking</p>
          <p className="text-2xl font-black text-orange-500">
            {org.stats.currentRank ? `#${org.stats.currentRank}` : "—"}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm text-zinc-500 mb-1">Vitórias</p>
          <p className="text-2xl font-black text-green-500">{org.stats.totalWins}</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm text-zinc-500 mb-1">Win Rate</p>
          <p className="text-2xl font-black text-white">{org.stats.winRate}%</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <p className="text-sm text-zinc-500 mb-1">Pontos</p>
          <p className="text-2xl font-black text-yellow-500">{org.stats.rankingPoints}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster */}
        <div className="lg:col-span-2">
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Roster ({org.roster?.length || 0})
              </h2>
              {canManage && (
                <button className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  Convidar
                </button>
              )}
            </div>

            <div className="space-y-2">
              {org.roster?.map((member: any) => (
                <div 
                  key={member._id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50"
                >
                  <img 
                    src={member.user?.steamAvatar || "/default-avatar.png"}
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{member.user?.nickname}</span>
                      {member.role === "OWNER" && <Crown className="w-4 h-4 text-yellow-500" />}
                      {member.role === "CAPTAIN" && <Crown className="w-4 h-4 text-blue-500" />}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {member.gameRole || member.role}
                    </span>
                  </div>
                  <span className="text-sm text-orange-400 font-medium">
                    {member.user?.elo_5v5 || 1000}
                  </span>
                </div>
              ))}

              {(!org.roster || org.roster.length === 0) && (
                <p className="text-center text-zinc-500 py-4">Sem membros</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Management Tools - FASE 55 */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-600/10 to-zinc-900 border border-orange-500/20">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              Gestão da Org
            </h3>
            <div className="space-y-2">
              <Link
                href="/esports/org/members"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Membros & Convites
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
              <Link
                href="/esports/org/roster"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  Roster & Divisões
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
              <Link
                href="/esports/org/calendar"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  Calendário
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
              <Link
                href="/esports/org/stratbook"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Stratbook
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
              {canManage && (
                <Link
                  href="/esports/org/settings"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
                >
                  <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    Sponsors & Branding
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </Link>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-bold text-white mb-3">Ações Rápidas</h3>
            <div className="space-y-2">
              <Link
                href="/esports/pracc"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white">🎯 Criar Pracc</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
              <Link
                href="/esports/tournaments"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-zinc-300 group-hover:text-white">🏆 Ver Torneios</span>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </Link>
            </div>
          </div>

          {/* Recent Matches */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Jogos Recentes
            </h3>
            {org.recentMatches && org.recentMatches.length > 0 ? (
              <div className="space-y-2">
                {org.recentMatches.slice(0, 3).map((match: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${match.isWin ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-sm text-zinc-300">vs {match.opponentName}</span>
                    </div>
                    <span className={`text-sm font-bold ${match.isWin ? "text-green-400" : "text-red-400"}`}>
                      {match.scoreUs}-{match.scoreThem}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Sem jogos recentes</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
