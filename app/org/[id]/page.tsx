"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { useState } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { 
  ChevronLeft,
  Trophy,
  Users,
  BarChart3,
  Newspaper,
  Settings,
  Shield,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Crown,
  UserPlus,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react";

/**
 * FASE 54: ORGANIZATION HUB PAGE
 * Full org profile with tabs
 */

type TabType = "overview" | "roster" | "matches" | "stats" | "news";

export default function OrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as Id<"organizations">;
  
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const org = useQuery(api.organizations.getOrganization, { orgId });
  const canManage = useQuery(api.organizations.canManage, { orgId });

  if (org === undefined) {
    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-white mb-2">Organização não encontrada</h1>
          <Link href="/rankings" className="text-orange-500 hover:underline">Ver Rankings</Link>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Shield className="w-4 h-4" /> },
    { id: "roster", label: "Roster", icon: <Users className="w-4 h-4" /> },
    { id: "matches", label: "Matches", icon: <Trophy className="w-4 h-4" /> },
    { id: "stats", label: "Stats", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "news", label: "News", icon: <Newspaper className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        {/* Banner */}
        <div className="relative h-48 w-full bg-gradient-to-r from-zinc-900 to-zinc-800">
          {org.bannerUrl && (
            <img 
              src={org.bannerUrl} 
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
          
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Settings button */}
          {canManage && (
            <Link
              href={`/org/${orgId}/manage`}
              className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
        </div>

        {/* Header */}
        <div className="px-8 -mt-16 relative z-10">
          <div className="flex items-end gap-6">
            {/* Logo */}
            <div className="w-32 h-32 rounded-2xl bg-zinc-900 border-4 border-zinc-950 overflow-hidden flex-shrink-0">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
                  <span className="text-3xl font-black text-white">{org.tag}</span>
                </div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white">{org.name}</h1>
                {org.isVerified && (
                  <CheckCircle className="w-6 h-6 text-blue-500" />
                )}
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-sm font-bold">
                  [{org.tag}]
                </span>
              </div>
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-2">
                {org.twitterUrl && (
                  <a href={org.twitterUrl} target="_blank" rel="noopener" className="text-zinc-400 hover:text-white">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {org.discordUrl && (
                  <a href={org.discordUrl} target="_blank" rel="noopener" className="text-zinc-400 hover:text-white">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6 pb-2">
              {org.stats.currentRank && (
                <div className="text-center">
                  <p className="text-3xl font-black text-orange-500">#{org.stats.currentRank}</p>
                  <p className="text-xs text-zinc-500">World Rank</p>
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{org.stats.totalWins}</p>
                <p className="text-xs text-zinc-500">Wins</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{org.stats.winRate}%</p>
                <p className="text-xs text-zinc-500">Win Rate</p>
              </div>
            </div>
          </div>

          {/* Sponsors */}
          {org.sponsors && org.sponsors.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Partners</span>
              <div className="flex items-center gap-3">
                {org.sponsors.map((sponsor: any) => (
                  <a 
                    key={sponsor._id}
                    href={sponsor.websiteUrl || "#"}
                    target="_blank"
                    rel="noopener"
                    className="h-8 px-3 rounded bg-zinc-900 flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                  >
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="h-5" />
                    ) : (
                      <span className="text-xs text-zinc-400">{sponsor.name}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-8 mt-6">
          <div className="flex items-center gap-1 border-b border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? "text-orange-500"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === "overview" && <OverviewTab org={org} />}
          {activeTab === "roster" && <RosterTab roster={org.roster} />}
          {activeTab === "matches" && <MatchesTab matches={org.recentMatches} />}
          {activeTab === "stats" && <StatsTab org={org} />}
          {activeTab === "news" && <NewsTab news={org.news} orgId={orgId} />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ org }: { org: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Description */}
      <div className="lg:col-span-2 space-y-6">
        {org.description && (
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="font-bold text-white mb-3">Sobre</h3>
            <p className="text-zinc-400 leading-relaxed">{org.description}</p>
          </div>
        )}

        {/* Recent Matches */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Jogos Recentes
          </h3>
          {org.recentMatches && org.recentMatches.length > 0 ? (
            <div className="space-y-2">
              {org.recentMatches.slice(0, 5).map((match: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${match.isWin ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-white font-medium">vs {match.opponentName}</span>
                    <span className="text-zinc-500 text-sm">{match.map}</span>
                  </div>
                  <span className={`font-bold ${match.isWin ? "text-green-400" : "text-red-400"}`}>
                    {match.scoreUs} - {match.scoreThem}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500">Sem jogos recentes</p>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Trophies */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Conquistas
          </h3>
          <div className="text-center py-4">
            <p className="text-4xl font-black text-yellow-500">{org.stats.rankingPoints || 0}</p>
            <p className="text-sm text-zinc-500 mt-1">Pontos de Ranking</p>
          </div>
        </div>

        {/* Active Roster Preview */}
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="font-bold text-white mb-3">Roster Ativo</h3>
          <div className="space-y-2">
            {org.roster?.filter((m: any) => m.role !== "BENCH").slice(0, 5).map((member: any) => (
              <div key={member._id} className="flex items-center gap-3">
                <img 
                  src={member.user?.steamAvatar || "/default-avatar.png"} 
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {member.user?.nickname || member.user?.steamName}
                  </p>
                  <p className="text-xs text-zinc-500">{member.gameRole || member.role}</p>
                </div>
                {member.role === "CAPTAIN" && <Crown className="w-4 h-4 text-yellow-500" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RosterTab({ roster }: { roster: any[] }) {
  const activePlayers = roster?.filter(m => m.isActive && m.role !== "BENCH") || [];
  const bench = roster?.filter(m => m.isActive && m.role === "BENCH") || [];
  const staff = roster?.filter(m => m.isActive && ["COACH", "ANALYST", "MANAGER"].includes(m.role)) || [];

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: "bg-yellow-500/20 text-yellow-400",
      MANAGER: "bg-purple-500/20 text-purple-400",
      CAPTAIN: "bg-blue-500/20 text-blue-400",
      PLAYER: "bg-green-500/20 text-green-400",
      COACH: "bg-orange-500/20 text-orange-400",
      ANALYST: "bg-cyan-500/20 text-cyan-400",
      BENCH: "bg-zinc-500/20 text-zinc-400",
    };
    return colors[role] || colors.PLAYER;
  };

  return (
    <div className="space-y-8">
      {/* Active Players */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Jogadores Ativos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePlayers.map((member: any) => (
            <div key={member._id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-4">
                <img 
                  src={member.user?.steamAvatar || "/default-avatar.png"}
                  alt=""
                  className="w-16 h-16 rounded-xl"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white">{member.user?.nickname}</h4>
                    {member.role === "CAPTAIN" && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-zinc-500">{member.user?.steamName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                    {member.gameRole && (
                      <span className="text-xs text-zinc-400">{member.gameRole}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">ELO</p>
                  <p className="text-lg font-bold text-orange-500">{member.user?.elo_5v5 || 1000}</p>
                </div>
                <Link 
                  href={`/profile/${member.userId}`}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Ver Perfil →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Bench</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {bench.map((member: any) => (
              <div key={member._id} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.user?.steamAvatar || "/default-avatar.png"}
                    alt=""
                    className="w-10 h-10 rounded-lg opacity-70"
                  />
                  <div>
                    <p className="font-medium text-zinc-400">{member.user?.nickname}</p>
                    <p className="text-xs text-zinc-600">{member.gameRole || "Bench"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff */}
      {staff.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Staff</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {staff.map((member: any) => (
              <div key={member._id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <img 
                    src={member.user?.steamAvatar || "/default-avatar.png"}
                    alt=""
                    className="w-10 h-10 rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-white">{member.user?.nickname}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadge(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchesTab({ matches }: { matches: any[] }) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4">Histórico de Jogos</h3>
      {matches && matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((match: any, idx: number) => (
            <div 
              key={idx}
              className={`flex items-center justify-between p-4 rounded-xl bg-zinc-900 border ${
                match.isWin ? "border-green-500/30" : "border-red-500/30"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                  match.isWin ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {match.isWin ? "W" : "L"}
                </div>
                <div>
                  <p className="font-bold text-white">vs {match.opponentName}</p>
                  <p className="text-sm text-zinc-500">{match.map}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${match.isWin ? "text-green-400" : "text-red-400"}`}>
                  {match.scoreUs} - {match.scoreThem}
                </p>
                <p className="text-sm text-zinc-500">{formatDate(match.playedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Sem jogos registados</p>
        </div>
      )}
    </div>
  );
}

function StatsTab({ org }: { org: any }) {
  const stats = org.stats;
  const totalMatches = (stats.totalWins || 0) + (stats.totalLosses || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Win/Loss */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-sm text-zinc-500 mb-2">Win/Loss Record</h3>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-3xl font-black text-green-400">{stats.totalWins || 0}</p>
            <p className="text-xs text-zinc-500">Wins</p>
          </div>
          <span className="text-2xl text-zinc-600">-</span>
          <div>
            <p className="text-3xl font-black text-red-400">{stats.totalLosses || 0}</p>
            <p className="text-xs text-zinc-500">Losses</p>
          </div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-sm text-zinc-500 mb-2">Win Rate</h3>
        <p className="text-4xl font-black text-white">{stats.winRate}%</p>
        <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            style={{ width: `${stats.winRate}%` }}
          />
        </div>
      </div>

      {/* Ranking Points */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-sm text-zinc-500 mb-2">Ranking Points</h3>
        <p className="text-4xl font-black text-orange-500">{stats.rankingPoints || 0}</p>
        <p className="text-sm text-zinc-500 mt-1">
          {stats.currentRank ? `#${stats.currentRank} no ranking` : "Sem ranking"}
        </p>
      </div>

      {/* Total Matches */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
        <h3 className="text-sm text-zinc-500 mb-2">Total de Jogos</h3>
        <p className="text-4xl font-black text-white">{totalMatches}</p>
      </div>

      {/* Placeholder for more stats */}
      <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 lg:col-span-2">
        <h3 className="text-sm text-zinc-500 mb-2">Performance por Mapa</h3>
        <p className="text-zinc-600">Estatísticas detalhadas em breve...</p>
      </div>
    </div>
  );
}

function NewsTab({ news, orgId }: { news: any[]; orgId: Id<"organizations"> }) {
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Notícias da Organização</h3>
      </div>
      
      {news && news.length > 0 ? (
        <div className="space-y-4">
          {news.map((article: any) => (
            <Link
              key={article._id}
              href={`/news/${article.slug}`}
              className="block p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <h4 className="font-bold text-white hover:text-orange-400 transition-colors">
                {article.title}
              </h4>
              {article.excerpt && (
                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{article.excerpt}</p>
              )}
              <p className="text-xs text-zinc-500 mt-2">{formatDate(article.publishedAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Newspaper className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Sem notícias publicadas</p>
        </div>
      )}
    </div>
  );
}
