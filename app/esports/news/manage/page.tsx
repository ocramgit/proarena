"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { 
  Plus,
  Loader2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  FileText
} from "lucide-react";

/**
 * FASE 54: NEWS CMS - MANAGE ARTICLES PAGE
 */

export default function ManageNewsPage() {
  const canCreate = useQuery(api.staffManagement.checkCanWriteNews);
  const articles = useQuery(api.newsroom.getArticlesForManagement);
  const deleteArticle = useMutation(api.newsroom.deleteArticle);

  // Not authorized
  if (canCreate === false) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-zinc-400">Não tens permissão para gerir notícias.</p>
      </div>
    );
  }

  // Loading
  if (canCreate === undefined || articles === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const handleDelete = async (articleId: Id<"articles">) => {
    if (!confirm("Tens a certeza que queres eliminar esta notícia?")) return;
    try {
      await deleteArticle({ articleId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getStatusBadge = (status: string) => {
    if (status === "PUBLISHED") {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
          <CheckCircle className="w-3 h-3" />
          Publicado
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-500/20 text-zinc-400">
        <FileText className="w-3 h-3" />
        Rascunho
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Gerir Notícias</h1>
          <p className="text-zinc-400">{articles.length} artigos</p>
        </div>
        <Link
          href="/esports/news/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Notícia
        </Link>
      </div>

      {/* Articles Table */}
      {articles.length > 0 ? (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-sm text-zinc-500">
                <th className="text-left p-4 font-medium">Artigo</th>
                <th className="text-left p-4 font-medium">Tipo</th>
                <th className="text-left p-4 font-medium">Estado</th>
                <th className="text-center p-4 font-medium">Views</th>
                <th className="text-left p-4 font-medium">Data</th>
                <th className="text-right p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article: any) => (
                <tr key={article._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {article.coverImageUrl ? (
                        <img 
                          src={article.coverImageUrl} 
                          alt=""
                          className="w-16 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-10 rounded bg-zinc-800 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-zinc-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate max-w-xs">
                            {article.title}
                          </p>
                          {article.isFeatured && (
                            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">{article.author}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {getTypeBadge(article.type)}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(article.status)}
                  </td>
                  <td className="p-4 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm text-zinc-400">
                      <Eye className="w-3 h-3" />
                      {article.views}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      {article.status === "PUBLISHED" ? (
                        <span className="text-zinc-400">{formatDate(article.publishedAt)}</span>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(article.createdAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/esports/news/${article.slug}`}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/esports/news/edit/${article._id}`}
                        className="p-2 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(article._id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl bg-zinc-900 border border-zinc-800">
          <FileText className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Sem notícias</h3>
          <p className="text-zinc-400 mb-6">Cria a primeira notícia do Hub.</p>
          <Link
            href="/esports/news/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Notícia
          </Link>
        </div>
      )}
    </div>
  );
}
