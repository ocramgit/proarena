"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { 
  ChevronLeft, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Image,
  Eye,
  Save
} from "lucide-react";

/**
 * FASE 54: NEWS CMS - CREATE ARTICLE PAGE
 */

export default function CreateArticlePage() {
  const router = useRouter();
  const canCreate = useQuery(api.staffManagement.checkCanWriteNews);
  const createArticle = useMutation(api.newsroom.createArticle);

  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    type: "EDITORIAL" as "EDITORIAL" | "ANNOUNCEMENT" | "TOURNAMENT",
    isFeatured: false,
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Not authorized
  if (canCreate === false) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-zinc-400">Não tens permissão para criar notícias.</p>
      </div>
    );
  }

  // Loading permission check
  if (canCreate === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (publishNow: boolean) => {
    setError(null);

    if (!formData.title.trim()) {
      setError("Título é obrigatório");
      return;
    }
    if (!formData.content.trim()) {
      setError("Conteúdo é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      await createArticle({
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim() || undefined,
        content: formData.content.trim(),
        coverImageUrl: formData.coverImageUrl.trim() || undefined,
        type: formData.type,
        isFeatured: formData.isFeatured,
        status: publishNow ? "PUBLISHED" : "DRAFT",
      });
      
      router.push("/esports/news/manage");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Criar Notícia</h1>
            <p className="text-zinc-400">Publica conteúdo no Esports Hub</p>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showPreview ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className={showPreview ? "hidden lg:block" : ""}>
          <div className="space-y-6 p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título da notícia"
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                maxLength={200}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="EDITORIAL">Editorial</option>
                <option value="ANNOUNCEMENT">Anúncio</option>
                <option value="TOURNAMENT">Torneio</option>
              </select>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <Image className="w-4 h-4 inline mr-1" />
                URL da Imagem de Capa
              </label>
              <input
                type="url"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Tamanho recomendado: 1920x1080</p>
              {formData.coverImageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden h-32 bg-zinc-800">
                  <img 
                    src={formData.coverImageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Resumo / Lead
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Breve resumo da notícia (aparece na listagem)"
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                rows={2}
                maxLength={300}
              />
              <p className="text-xs text-zinc-500 mt-1">{formData.excerpt.length}/300</p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Conteúdo *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escreve o conteúdo completo da notícia..."
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none font-mono text-sm"
                rows={12}
              />
              <p className="text-xs text-zinc-500 mt-1">Suporta quebras de linha</p>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="isFeatured" className="text-sm text-zinc-300">
                Destacar esta notícia (aparece no topo)
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className="flex-1 py-3 rounded-lg bg-zinc-700 text-white font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Rascunho
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className="flex-1 py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Publicar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className={!showPreview && "hidden lg:block" ? "" : ""}>
          <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 mb-4">Preview</h3>
            
            {/* Cover Image Preview */}
            <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-zinc-800">
              {formData.coverImageUrl ? (
                <img 
                  src={formData.coverImageUrl} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${formData.coverImageUrl ? 'hidden' : ''}`}>
                <Image className="w-12 h-12 text-zinc-700" />
              </div>
            </div>

            {/* Type Badge */}
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-3 ${
              formData.type === "EDITORIAL" ? "bg-blue-500/20 text-blue-400" :
              formData.type === "ANNOUNCEMENT" ? "bg-orange-500/20 text-orange-400" :
              "bg-yellow-500/20 text-yellow-400"
            }`}>
              {formData.type === "EDITORIAL" ? "Editorial" :
               formData.type === "ANNOUNCEMENT" ? "Anúncio" : "Torneio"}
            </span>

            {/* Title */}
            <h2 className="text-2xl font-black text-white mb-2">
              {formData.title || "Título da notícia"}
            </h2>

            {/* Excerpt */}
            {formData.excerpt && (
              <p className="text-zinc-400 mb-4">{formData.excerpt}</p>
            )}

            {/* Content Preview */}
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-zinc-300 whitespace-pre-wrap">
                {formData.content || "O conteúdo da notícia aparecerá aqui..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
