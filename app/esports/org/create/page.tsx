"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { 
  Building2, 
  ChevronLeft, 
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";

/**
 * FASE 54 REFACTOR: CREATE ORGANIZATION PAGE (Within Esports Hub)
 */

export default function CreateOrgPage() {
  const router = useRouter();
  const createOrg = useMutation(api.organizations.createOrganization);

  const [formData, setFormData] = useState({
    name: "",
    tag: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Nome da organização é obrigatório");
      return;
    }
    if (!formData.tag.trim()) {
      setError("Tag é obrigatória");
      return;
    }
    if (formData.tag.length < 2 || formData.tag.length > 5) {
      setError("Tag deve ter entre 2 e 5 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      const orgId = await createOrg({
        name: formData.name.trim(),
        tag: formData.tag.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        bannerUrl: formData.bannerUrl.trim() || undefined,
      });
      
      router.push(`/esports/org`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Criar Organização</h1>
          <p className="text-zinc-400">Cria a tua equipa e compete</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Name & Tag */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nome da Organização *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Soberana Esports"
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tag *
            </label>
            <input
              type="text"
              value={formData.tag}
              onChange={(e) => setFormData({ ...formData, tag: e.target.value.toUpperCase() })}
              placeholder="SOB"
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 uppercase"
              maxLength={5}
              required
            />
            <p className="text-xs text-zinc-500 mt-1">2-5 caracteres</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Fala-nos da tua organização..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-zinc-500 mt-1">{formData.description.length}/500</p>
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            URL do Logo
          </label>
          <input
            type="url"
            value={formData.logoUrl}
            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-zinc-500 mt-1">Imagem quadrada recomendada (256x256)</p>
        </div>

        {/* Banner URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            URL do Banner
          </label>
          <input
            type="url"
            value={formData.bannerUrl}
            onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
          <p className="text-xs text-zinc-500 mt-1">Tamanho recomendado: 1920x400</p>
        </div>

        {/* Preview */}
        {(formData.name || formData.tag) && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-3">Pré-visualização</p>
            <div className="flex items-center gap-4">
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="w-16 h-16 rounded-xl object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <span className="text-xl font-black text-white">{formData.tag || "?"}</span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{formData.name || "Nome da Organização"}</h3>
                <span className="text-zinc-500">[{formData.tag || "TAG"}]</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                A criar...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Criar Organização
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
