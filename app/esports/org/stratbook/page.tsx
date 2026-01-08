"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BookOpen,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Lock,
  Map,
  Target,
  Shield,
  Plus,
  ChevronRight,
  Flame,
  Wind,
  Sparkles,
  Circle
} from "lucide-react";

/**
 * FASE 55: STRATBOOK - PRIVATE TACTICAL REPOSITORY
 * Map-based organization with strategies and nades
 */

const MAP_IMAGES: Record<string, string> = {
  mirage: "https://static.wikia.nocookie.net/cswikia/images/e/e6/Csgo-de-mirage.png",
  inferno: "https://static.wikia.nocookie.net/cswikia/images/6/64/Csgo-de-inferno.png",
  nuke: "https://static.wikia.nocookie.net/cswikia/images/9/96/Csgo-de-nuke.png",
  ancient: "https://static.wikia.nocookie.net/cswikia/images/7/71/Ancient_CS2.webp",
  anubis: "https://static.wikia.nocookie.net/cswikia/images/c/c0/Anubis_CS2.webp",
  vertigo: "https://static.wikia.nocookie.net/cswikia/images/8/8e/Vertigo_CS2.webp",
  dust2: "https://static.wikia.nocookie.net/cswikia/images/5/5a/Csgo-de-dust2.png",
};

export default function StratbookPage() {
  const router = useRouter();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  const maps = useQuery(api.stratbook.getMaps,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const antiStrats = useQuery(api.stratbook.getAntiStrats,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  
  const initializeMaps = useMutation(api.stratbook.initializeMaps);

  // Not in an org
  if (myOrg === null) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Sem Organização</h2>
        <p className="text-zinc-400">Não fazes parte de nenhuma organização.</p>
      </div>
    );
  }

  // Loading
  if (myOrg === undefined || maps === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Access denied (not active member or no stratbook access)
  if (maps.length === 0 && myOrg) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-zinc-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Stratbook</h2>
        <p className="text-zinc-400 mb-6">
          O Stratbook ainda não foi inicializado ou não tens acesso.
        </p>
        <button
          onClick={() => initializeMaps({ orgId: myOrg._id as Id<"organizations"> })}
          className="px-6 py-3 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
        >
          Inicializar Stratbook
        </button>
      </div>
    );
  }

  const org = myOrg;
  const activeMaps = maps.filter((m: any) => m.isActive);
  const inactiveMaps = maps.filter((m: any) => !m.isActive);

  return (
    <div>
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
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-orange-500" />
              Stratbook
            </h1>
            <p className="text-zinc-400 flex items-center gap-2">
              <Lock className="w-3 h-3" />
              [{org.tag}] {org.name} - Conteúdo privado
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
        <Lock className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-300">
          <strong>Área Privada:</strong> Este conteúdo é exclusivo para membros ativos da organização. 
          Se saíres ou fores removido, perdes o acesso imediatamente.
        </p>
      </div>

      {/* Map Pool */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Map className="w-5 h-5 text-green-500" />
          Map Pool Ativo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeMaps.map((map: any) => (
            <Link
              key={map._id}
              href={`/esports/org/stratbook/${map.mapName}`}
              className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 transition-all"
            >
              {/* Map Image */}
              <div className="aspect-video bg-zinc-800 relative overflow-hidden">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-300"
                  style={{ backgroundImage: `url(${MAP_IMAGES[map.mapName] || ''})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
              </div>

              {/* Map Info */}
              <div className="p-4">
                <h3 className="font-bold text-white text-lg group-hover:text-orange-400 transition-colors">
                  {map.displayName}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {map.strategyCount} strats
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {map.nadeCount} nades
                  </span>
                </div>
              </div>

              {/* Hover Arrow */}
              <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="w-6 h-6 text-orange-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Inactive Maps */}
      {inactiveMaps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-zinc-500 mb-4">Mapas Inativos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {inactiveMaps.map((map: any) => (
              <Link
                key={map._id}
                href={`/esports/org/stratbook/${map.mapName}`}
                className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-zinc-500">{map.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Anti-Strat Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Anti-Strat Notes
          </h2>
          <Link
            href="/esports/org/stratbook/antistrat"
            className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1"
          >
            Ver todas
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {antiStrats && antiStrats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {antiStrats.slice(0, 6).map((note: any) => (
              <div
                key={note._id}
                className={`p-4 rounded-xl border ${
                  note.isRelevant 
                    ? "bg-zinc-900 border-zinc-800" 
                    : "bg-zinc-900/50 border-zinc-800/50 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white truncate">{note.opponentName}</h4>
                  {note.mapName && (
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {note.mapName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 truncate">{note.title}</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Atualizado: {new Date(note.lastUpdated).toLocaleDateString("pt-PT")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Sem notas de anti-strat</p>
            <Link
              href="/esports/org/stratbook/antistrat/new"
              className="inline-flex items-center gap-2 mt-4 text-sm text-orange-500 hover:text-orange-400"
            >
              <Plus className="w-4 h-4" />
              Adicionar nota
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
          <Map className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{activeMaps.length}</p>
          <p className="text-xs text-zinc-500">Mapas Ativos</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
          <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">
            {maps.reduce((sum: number, m: any) => sum + m.strategyCount, 0)}
          </p>
          <p className="text-xs text-zinc-500">Strategies</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">
            {maps.reduce((sum: number, m: any) => sum + m.nadeCount, 0)}
          </p>
          <p className="text-xs text-zinc-500">Nades</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
          <Shield className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-black text-white">{antiStrats?.length || 0}</p>
          <p className="text-xs text-zinc-500">Anti-Strats</p>
        </div>
      </div>
    </div>
  );
}
