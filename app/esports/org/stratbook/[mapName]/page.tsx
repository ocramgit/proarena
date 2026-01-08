"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft,
  Loader2,
  AlertCircle,
  Plus,
  Target,
  Flame,
  Wind,
  Sparkles,
  Circle,
  X,
  Play,
  Image,
  Edit,
  Trash2,
  Filter
} from "lucide-react";

/**
 * FASE 55: STRATBOOK - MAP DETAIL PAGE
 * Strategies and Nades for a specific map
 */

const NADE_ICONS: Record<string, any> = {
  SMOKE: { icon: Wind, color: "text-gray-400 bg-gray-500/20" },
  MOLOTOV: { icon: Flame, color: "text-orange-400 bg-orange-500/20" },
  FLASH: { icon: Sparkles, color: "text-yellow-400 bg-yellow-500/20" },
  HE: { icon: Circle, color: "text-red-400 bg-red-500/20" },
  DECOY: { icon: Circle, color: "text-blue-400 bg-blue-500/20" },
};

const CATEGORY_LABELS: Record<string, string> = {
  PISTOL: "Pistol Round",
  ECO: "Eco",
  FORCE: "Force Buy",
  FULL_BUY: "Full Buy",
  ANTI_ECO: "Anti-Eco",
  RETAKE: "Retake",
  DEFAULT: "Default",
  EXECUTE: "Execute",
  FAKE: "Fake",
  OTHER: "Outro",
};

export default function StratbookMapPage() {
  const params = useParams();
  const router = useRouter();
  const mapName = params.mapName as string;

  const myOrg = useQuery(api.organizations.getMyOrganization);
  const maps = useQuery(api.stratbook.getMaps,
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );

  const currentMap = maps?.find((m: any) => m.mapName === mapName);

  const strategies = useQuery(api.stratbook.getStrategies,
    currentMap?._id ? { mapId: currentMap._id as Id<"stratbook_maps"> } : "skip"
  );
  const nades = useQuery(api.stratbook.getNades,
    currentMap?._id ? { mapId: currentMap._id as Id<"stratbook_maps"> } : "skip"
  );

  const createStrategy = useMutation(api.stratbook.createStrategy);
  const createNade = useMutation(api.stratbook.createNade);
  const deleteStrategy = useMutation(api.stratbook.deleteStrategy);
  const deleteNade = useMutation(api.stratbook.deleteNade);

  const [activeTab, setActiveTab] = useState<"strategies" | "nades">("strategies");
  const [sideFilter, setSideFilter] = useState<"ALL" | "T" | "CT">("ALL");
  const [showStratModal, setShowStratModal] = useState(false);
  const [showNadeModal, setShowNadeModal] = useState(false);

  const [newStrat, setNewStrat] = useState({
    title: "",
    category: "DEFAULT" as any,
    side: "T" as "T" | "CT" | "BOTH",
    description: "",
    videoUrl: "",
    imageUrl: "",
  });

  const [newNade, setNewNade] = useState({
    title: "",
    nadeType: "SMOKE" as any,
    side: "T" as "T" | "CT",
    description: "",
    videoUrl: "",
    imageUrl: "",
    throwPosition: "",
    landingPosition: "",
  });

  // Loading
  if (myOrg === undefined || maps === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!currentMap) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Mapa não encontrado</h2>
        <p className="text-zinc-400">Este mapa não existe no stratbook.</p>
      </div>
    );
  }

  const filteredStrategies = strategies?.filter((s: any) => 
    sideFilter === "ALL" || s.side === sideFilter || s.side === "BOTH"
  ) || [];

  const filteredNades = nades?.filter((n: any) => 
    sideFilter === "ALL" || n.side === sideFilter
  ) || [];

  const handleCreateStrategy = async () => {
    if (!newStrat.title.trim() || !newStrat.description.trim()) return;

    try {
      await createStrategy({
        mapId: currentMap._id,
        title: newStrat.title,
        category: newStrat.category,
        side: newStrat.side,
        description: newStrat.description,
        videoUrl: newStrat.videoUrl || undefined,
        imageUrl: newStrat.imageUrl || undefined,
      });
      setShowStratModal(false);
      setNewStrat({
        title: "",
        category: "DEFAULT",
        side: "T",
        description: "",
        videoUrl: "",
        imageUrl: "",
      });
    } catch (err) {
      console.error("Failed to create strategy:", err);
    }
  };

  const handleCreateNade = async () => {
    if (!newNade.title.trim()) return;

    try {
      await createNade({
        mapId: currentMap._id,
        title: newNade.title,
        nadeType: newNade.nadeType,
        side: newNade.side,
        description: newNade.description || undefined,
        videoUrl: newNade.videoUrl || undefined,
        imageUrl: newNade.imageUrl || undefined,
        throwPosition: newNade.throwPosition || undefined,
        landingPosition: newNade.landingPosition || undefined,
      });
      setShowNadeModal(false);
      setNewNade({
        title: "",
        nadeType: "SMOKE",
        side: "T",
        description: "",
        videoUrl: "",
        imageUrl: "",
        throwPosition: "",
        landingPosition: "",
      });
    } catch (err) {
      console.error("Failed to create nade:", err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/esports/org/stratbook")}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">{currentMap.displayName}</h1>
            <p className="text-zinc-400">
              {strategies?.length || 0} strategies • {nades?.length || 0} nades
            </p>
          </div>
        </div>

        {/* Side Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            {["ALL", "T", "CT"].map((side) => (
              <button
                key={side}
                onClick={() => setSideFilter(side as any)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  sideFilter === side 
                    ? side === "T" ? "bg-yellow-600 text-white" 
                      : side === "CT" ? "bg-blue-600 text-white" 
                      : "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {side === "ALL" ? "Todos" : side}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("strategies")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === "strategies"
              ? "text-orange-500 border-orange-500"
              : "text-zinc-400 border-transparent hover:text-white"
          }`}
        >
          <Target className="w-4 h-4" />
          Strategies ({filteredStrategies.length})
        </button>
        <button
          onClick={() => setActiveTab("nades")}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
            activeTab === "nades"
              ? "text-orange-500 border-orange-500"
              : "text-zinc-400 border-transparent hover:text-white"
          }`}
        >
          <Flame className="w-4 h-4" />
          Nades ({filteredNades.length})
        </button>
        <div className="flex-1" />
        <button
          onClick={() => activeTab === "strategies" ? setShowStratModal(true) : setShowNadeModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors mb-2"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "strategies" ? "Nova Strategy" : "Nova Nade"}
        </button>
      </div>

      {/* Strategies Tab */}
      {activeTab === "strategies" && (
        <div className="space-y-4">
          {filteredStrategies.length > 0 ? (
            filteredStrategies.map((strat: any) => (
              <div
                key={strat._id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        strat.side === "T" ? "bg-yellow-600/20 text-yellow-400" :
                        strat.side === "CT" ? "bg-blue-600/20 text-blue-400" :
                        "bg-zinc-700 text-zinc-300"
                      }`}>
                        {strat.side}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-400">
                        {CATEGORY_LABELS[strat.category] || strat.category}
                      </span>
                      {strat.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                          Principal
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-lg">{strat.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {strat.videoUrl && (
                      <a
                        href={strat.videoUrl}
                        target="_blank"
                        rel="noopener"
                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Play className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => deleteStrategy({ strategyId: strat._id })}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {strat.imageUrl && (
                  <img
                    src={strat.imageUrl}
                    alt=""
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                )}

                <p className="text-zinc-300 whitespace-pre-wrap">{strat.description}</p>

                <p className="text-xs text-zinc-600 mt-3">
                  Criado por {strat.createdByName} • {new Date(strat.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Sem strategies para este filtro</p>
            </div>
          )}
        </div>
      )}

      {/* Nades Tab */}
      {activeTab === "nades" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNades.length > 0 ? (
            filteredNades.map((nade: any) => {
              const nadeInfo = NADE_ICONS[nade.nadeType] || NADE_ICONS.SMOKE;
              const NadeIcon = nadeInfo.icon;
              return (
                <div
                  key={nade._id}
                  className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${nadeInfo.color}`}>
                        <NadeIcon className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        nade.side === "T" ? "bg-yellow-600/20 text-yellow-400" : "bg-blue-600/20 text-blue-400"
                      }`}>
                        {nade.side}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {nade.videoUrl && (
                        <a
                          href={nade.videoUrl}
                          target="_blank"
                          rel="noopener"
                          className="p-1.5 rounded text-zinc-400 hover:text-white transition-colors"
                        >
                          <Play className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteNade({ nadeId: nade._id })}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {nade.imageUrl && (
                    <img
                      src={nade.imageUrl}
                      alt=""
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}

                  <h4 className="font-bold text-white mb-1">{nade.title}</h4>

                  {(nade.throwPosition || nade.landingPosition) && (
                    <p className="text-xs text-zinc-500 mb-2">
                      {nade.throwPosition && <span>De: {nade.throwPosition}</span>}
                      {nade.throwPosition && nade.landingPosition && " → "}
                      {nade.landingPosition && <span>Para: {nade.landingPosition}</span>}
                    </p>
                  )}

                  {nade.description && (
                    <p className="text-sm text-zinc-400">{nade.description}</p>
                  )}

                  {nade.tags && nade.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {nade.tags.map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-zinc-800 text-zinc-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Flame className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Sem nades para este filtro</p>
            </div>
          )}
        </div>
      )}

      {/* Create Strategy Modal */}
      {showStratModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nova Strategy</h2>
              <button onClick={() => setShowStratModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Título *</label>
                <input
                  type="text"
                  value={newStrat.title}
                  onChange={(e) => setNewStrat({ ...newStrat, title: e.target.value })}
                  placeholder="Ex: Default A Execute"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Side</label>
                  <select
                    value={newStrat.side}
                    onChange={(e) => setNewStrat({ ...newStrat, side: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="T">Terrorist</option>
                    <option value="CT">Counter-Terrorist</option>
                    <option value="BOTH">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Categoria</label>
                  <select
                    value={newStrat.category}
                    onChange={(e) => setNewStrat({ ...newStrat, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição *</label>
                <textarea
                  value={newStrat.description}
                  onChange={(e) => setNewStrat({ ...newStrat, description: e.target.value })}
                  placeholder="Descreve a tática em detalhe..."
                  rows={6}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">URL do Vídeo (opcional)</label>
                <input
                  type="url"
                  value={newStrat.videoUrl}
                  onChange={(e) => setNewStrat({ ...newStrat, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">URL da Imagem (opcional)</label>
                <input
                  type="url"
                  value={newStrat.imageUrl}
                  onChange={(e) => setNewStrat({ ...newStrat, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowStratModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateStrategy}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                Criar Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Nade Modal */}
      {showNadeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Nova Nade</h2>
              <button onClick={() => setShowNadeModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Título *</label>
                <input
                  type="text"
                  value={newNade.title}
                  onChange={(e) => setNewNade({ ...newNade, title: e.target.value })}
                  placeholder="Ex: A Site Smoke from T Spawn"
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Tipo</label>
                  <select
                    value={newNade.nadeType}
                    onChange={(e) => setNewNade({ ...newNade, nadeType: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="SMOKE">Smoke</option>
                    <option value="MOLOTOV">Molotov</option>
                    <option value="FLASH">Flash</option>
                    <option value="HE">HE Grenade</option>
                    <option value="DECOY">Decoy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Side</label>
                  <select
                    value={newNade.side}
                    onChange={(e) => setNewNade({ ...newNade, side: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="T">Terrorist</option>
                    <option value="CT">Counter-Terrorist</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Posição de Lançamento</label>
                  <input
                    type="text"
                    value={newNade.throwPosition}
                    onChange={(e) => setNewNade({ ...newNade, throwPosition: e.target.value })}
                    placeholder="Ex: T Spawn"
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Posição de Aterragem</label>
                  <input
                    type="text"
                    value={newNade.landingPosition}
                    onChange={(e) => setNewNade({ ...newNade, landingPosition: e.target.value })}
                    placeholder="Ex: A Site"
                    className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Descrição</label>
                <textarea
                  value={newNade.description}
                  onChange={(e) => setNewNade({ ...newNade, description: e.target.value })}
                  placeholder="Notas adicionais..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">URL do Vídeo/Clip</label>
                <input
                  type="url"
                  value={newNade.videoUrl}
                  onChange={(e) => setNewNade({ ...newNade, videoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">URL da Imagem</label>
                <input
                  type="url"
                  value={newNade.imageUrl}
                  onChange={(e) => setNewNade({ ...newNade, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNadeModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNade}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
              >
                Criar Nade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
