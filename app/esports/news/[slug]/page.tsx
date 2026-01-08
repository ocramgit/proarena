"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Clock, 
  Eye, 
  Share2,
  Building2,
  User,
  Loader2
} from "lucide-react";

/**
 * FASE 54: ARTICLE DETAIL PAGE (Within Esports Hub)
 */

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const article = useQuery(api.newsroom.getArticleBySlug, { slug });
  const incrementViews = useMutation(api.newsroom.incrementViews);

  // Increment views on load
  useEffect(() => {
    if (article?._id) {
      incrementViews({ articleId: article._id });
    }
  }, [article?._id]);

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (article === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Artigo não encontrado</h1>
        <p className="text-zinc-400 mb-4">O artigo que procuras não existe ou foi removido.</p>
        <Link href="/esports" className="text-orange-500 hover:underline">
          Voltar às notícias
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Hero Banner */}
      {article.coverImageUrl && (
        <div className="relative h-80 w-full rounded-2xl overflow-hidden mb-8">
          <img 
            src={article.coverImageUrl} 
            alt={article.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
        </div>
      )}

      {/* Article Header */}
      <header className="mb-8">
        {/* Type Badge */}
        <div className="flex items-center gap-3 mb-4">
          {article.type === "ORG_NEWS" && article.org ? (
            <Link 
              href={`/esports/org`}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              {article.org.name}
            </Link>
          ) : (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              article.type === "ANNOUNCEMENT" 
                ? "bg-orange-500/20 text-orange-400"
                : article.type === "TOURNAMENT"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-blue-500/20 text-blue-400"
            }`}>
              {article.type === "ANNOUNCEMENT" ? "Anúncio Oficial" : 
               article.type === "TOURNAMENT" ? "Torneio" : "Editorial"}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
          {article.title}
        </h1>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-xl text-zinc-400 mt-4 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-zinc-800">
          {/* Author */}
          <div className="flex items-center gap-3">
            {article.author?.steamAvatar ? (
              <img 
                src={article.author.steamAvatar} 
                alt=""
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-5 h-5 text-zinc-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-white">{article.author?.nickname || "Staff"}</p>
              <p className="text-sm text-zinc-500">Autor</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4" />
            <span>{formatDate(article.publishedAt)}</span>
          </div>

          {/* Views */}
          {article.views && article.views > 0 && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Eye className="w-4 h-4" />
              <span>{article.views} visualizações</span>
            </div>
          )}

          {/* Share */}
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Link copiado!");
            }}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Partilhar
          </button>
        </div>
      </header>

      {/* Article Content */}
      <article className="prose prose-invert prose-lg max-w-none">
        <div 
          className="text-zinc-300 leading-relaxed whitespace-pre-wrap"
        >
          {article.content}
        </div>
      </article>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-zinc-800">
        <Link 
          href="/esports"
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Ver todas as notícias
        </Link>
      </footer>
    </div>
  );
}
