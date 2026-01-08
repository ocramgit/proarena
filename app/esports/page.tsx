"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { 
  Newspaper, 
  Clock, 
  Eye,
  TrendingUp,
  Trophy,
  Loader2,
  PenSquare,
  Building2,
  ChevronRight
} from "lucide-react";

/**
 * FASE 54 REFACTOR: ESPORTS HUB - NEWS PAGE
 * Internal CMS news feed only - no mocked data
 */

export default function EsportsNewsPage() {
  const featuredNews = useQuery(api.newsroom.getFeaturedArticles, { limit: 5 });
  const allNews = useQuery(api.newsroom.getNewsFeed, { limit: 20 });
  const isEditor = useQuery(api.staffManagement.checkCanWriteNews);

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Agora";
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ontem";
    return `${days} dias atrás`;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, { bg: string; label: string }> = {
      EDITORIAL: { bg: "bg-blue-500/20 text-blue-400", label: "Editorial" },
      ANNOUNCEMENT: { bg: "bg-orange-500/20 text-orange-400", label: "Anúncio" },
      ORG_NEWS: { bg: "bg-purple-500/20 text-purple-400", label: "Org News" },
      TOURNAMENT: { bg: "bg-yellow-500/20 text-yellow-400", label: "Torneio" },
    };
    const style = styles[type] || styles.EDITORIAL;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg}`}>
        {style.label}
      </span>
    );
  };

  if (featuredNews === undefined || allNews === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const hasNews = (featuredNews && featuredNews.length > 0) || (allNews && allNews.length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main News Feed */}
      <div className="lg:col-span-2 space-y-6">
        {/* Editor CTA */}
        {isEditor && (
          <Link
            href="/esports/news/create"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-orange-600/20 to-zinc-900 border border-orange-500/30 hover:border-orange-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <PenSquare className="w-6 h-6 text-orange-500" />
              <div>
                <p className="font-bold text-white">Criar Notícia</p>
                <p className="text-sm text-zinc-400">Publica conteúdo no Hub</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
          </Link>
        )}

        {/* Hero Article */}
        {featuredNews && featuredNews.length > 0 && (
          <Link 
            href={`/esports/news/${featuredNews[0].slug}`}
            className="block relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 transition-all group"
          >
            <div className="aspect-video relative">
              {featuredNews[0].coverImageUrl ? (
                <>
                  <img 
                    src={featuredNews[0].coverImageUrl} 
                    alt={featuredNews[0].title}
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 to-zinc-900" />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                {getTypeBadge(featuredNews[0].type)}
                <h2 className="text-2xl lg:text-3xl font-black text-white mt-3 group-hover:text-orange-400 transition-colors">
                  {featuredNews[0].title}
                </h2>
                {featuredNews[0].excerpt && (
                  <p className="text-zinc-300 mt-2 line-clamp-2">{featuredNews[0].excerpt}</p>
                )}
                <div className="flex items-center gap-4 mt-4 text-sm text-zinc-400">
                  <span>{featuredNews[0].author}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(featuredNews[0].publishedAt)}
                  </span>
                  {featuredNews[0].views > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {featuredNews[0].views}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Secondary Featured */}
        {featuredNews && featuredNews.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredNews.slice(1, 3).map((article: any) => (
              <Link
                key={article._id}
                href={`/esports/news/${article.slug}`}
                className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 transition-all group"
              >
                <div className="aspect-[16/10] relative">
                  {article.coverImageUrl ? (
                    <>
                      <img 
                        src={article.coverImageUrl} 
                        alt={article.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {getTypeBadge(article.type)}
                    <h3 className="font-bold text-white mt-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2">
                      {formatTime(article.publishedAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* All News List */}
        {allNews && allNews.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-orange-500" />
              Todas as Notícias
            </h3>
            <div className="space-y-3">
              {allNews.map((article: any) => (
                <Link
                  key={article._id}
                  href={`/esports/news/${article.slug}`}
                  className="flex gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  {/* Thumbnail */}
                  <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                    {article.coverImageUrl ? (
                      <img 
                        src={article.coverImageUrl} 
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-800">
                        <Newspaper className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeBadge(article.type)}
                      {article.org && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Building2 className="w-3 h-3" />
                          {article.org.name}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{article.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span>{article.author}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(article.publishedAt)}
                      </span>
                      {article.views > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {article.views}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasNews && (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sem notícias de momento</h3>
            <p className="text-zinc-400 mb-6">As notícias do cenário competitivo aparecerão aqui.</p>
            {isEditor && (
              <Link
                href="/esports/news/create"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                <PenSquare className="w-4 h-4" />
                Criar primeira notícia
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Rankings Preview */}
        <Link
          href="/esports/rankings"
          className="block p-4 rounded-xl bg-gradient-to-br from-orange-600/20 to-zinc-900 border border-orange-500/30 hover:border-orange-500/50 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              World Rankings
            </h3>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">1. Team Vitality</span>
              <span className="text-orange-400 font-medium">1000 pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">2. Team Spirit</span>
              <span className="text-zinc-500">945 pts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">3. NAVI</span>
              <span className="text-zinc-500">891 pts</span>
            </div>
          </div>
          <p className="text-xs text-orange-400 mt-3 flex items-center gap-1">
            Ver ranking completo
            <ChevronRight className="w-3 h-3" />
          </p>
        </Link>

        {/* Quick Links */}
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <h3 className="font-bold text-white mb-3">Acesso Rápido</h3>
          <div className="space-y-2">
            <Link 
              href="/esports/org"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-zinc-300 group-hover:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Minha Organização
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </Link>
            <Link 
              href="/esports/pracc"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-zinc-300 group-hover:text-white">🎯 Pracc Finder</span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </Link>
            <Link 
              href="/esports/tournaments"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 transition-colors group"
            >
              <span className="text-zinc-300 group-hover:text-white">🏆 Torneios</span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </Link>
          </div>
        </div>

        {/* CMS Info for Editors */}
        {isEditor && (
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <h3 className="font-bold text-blue-400 mb-2">Modo Editor</h3>
            <p className="text-sm text-zinc-400">
              Podes criar e gerir notícias através do CMS.
            </p>
            <Link
              href="/esports/news/manage"
              className="text-sm text-blue-400 hover:text-blue-300 mt-2 inline-block"
            >
              Gerir notícias →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
