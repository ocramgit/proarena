"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { 
  Target,
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  FileVideo,
  AlertCircle
} from "lucide-react";

/**
 * FASE 54 REFACTOR: PRACC FINDER (Within Esports Hub)
 */

export default function PraccFinderPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"finder" | "my-praccs" | "demos">("finder");
  const [mapFilter, setMapFilter] = useState("");

  const myOrg = useQuery(api.organizations.getMyOrganization);
  const availablePraccs = useQuery(api.praccs.searchPraccs, {
    map: mapFilter || undefined,
  });
  const myPraccs = useQuery(api.praccs.getMyOrgPraccs, 
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations"> } : "skip"
  );
  const myDemos = useQuery(api.praccs.getOrgDemos, 
    myOrg?._id ? { orgId: myOrg._id as Id<"organizations">, limit: 20 } : "skip"
  );

  const acceptPracc = useMutation(api.praccs.acceptPracc);
  const cancelPracc = useMutation(api.praccs.cancelPracc);
  const confirmPracc = useMutation(api.praccs.confirmAndStartPracc);

  const maps = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_vertigo"];

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: "bg-green-500/20 text-green-400",
      MATCHED: "bg-yellow-500/20 text-yellow-400",
      CONFIRMED: "bg-blue-500/20 text-blue-400",
      LIVE: "bg-red-500/20 text-red-400 animate-pulse",
      FINISHED: "bg-zinc-500/20 text-zinc-400",
      CANCELLED: "bg-zinc-800 text-zinc-600",
    };
    return styles[status] || styles.OPEN;
  };

  const handleAccept = async (praccId: Id<"praccs">) => {
    if (!myOrg?._id) return;
    try {
      await acceptPracc({ praccId, orgId: myOrg._id as Id<"organizations"> });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirm = async (praccId: Id<"praccs">) => {
    try {
      await confirmPracc({ praccId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (praccId: Id<"praccs">) => {
    if (!confirm("Cancelar este pracc?")) return;
    try {
      await cancelPracc({ praccId });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // No org warning
  if (!myOrg) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Organização Necessária</h2>
        <p className="text-zinc-400 mb-6">
          Precisas de estar numa organização para usar o Pracc Finder.
        </p>
        <a 
          href="/esports/org"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
        >
          Criar/Juntar Organização
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Target className="w-7 h-7 text-orange-500" />
            Pracc Finder
          </h1>
          <p className="text-zinc-400 mt-1">Encontra equipas para treinar</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Criar Pedido
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-800">
        {[
          { id: "finder", label: "Finder", icon: Search },
          { id: "my-praccs", label: "Os Meus Praccs", icon: Calendar },
          { id: "demos", label: "Demo Center", icon: FileVideo },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "text-orange-500 border-orange-500"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Finder Tab */}
      {activeTab === "finder" && (
        <div>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <select
              value={mapFilter}
              onChange={(e) => setMapFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-orange-500"
            >
              <option value="">Todos os Mapas</option>
              {maps.map((map) => (
                <option key={map} value={map}>{map}</option>
              ))}
            </select>
          </div>

          {/* Pracc List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availablePraccs?.filter((p: any) => p.org?._id !== myOrg?._id).map((pracc: any) => (
              <div 
                key={pracc._id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">
                    {pracc.org?.logoUrl ? (
                      <img src={pracc.org.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-zinc-600">
                        {pracc.org?.tag}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{pracc.org?.name}</h3>
                      {pracc.org?.isVerified && <CheckCircle className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-sm text-zinc-500">[{pracc.org?.tag}]</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="w-4 h-4" />
                    {formatDate(pracc.scheduledDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="w-4 h-4" />
                    {pracc.duration} minutos
                  </div>
                  {pracc.map && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="w-4 h-4" />
                      {pracc.map}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span className="text-orange-400 font-medium">~{pracc.avgElo} ELO</span>
                  </div>
                </div>

                {pracc.notes && (
                  <p className="text-sm text-zinc-500 mb-4 italic">"{pracc.notes}"</p>
                )}

                <button
                  onClick={() => handleAccept(pracc._id)}
                  className="w-full py-2 rounded-lg bg-green-500/20 text-green-400 font-medium hover:bg-green-500/30 transition-colors"
                >
                  Aceitar Pracc
                </button>
              </div>
            ))}

            {(!availablePraccs || availablePraccs.filter((p: any) => p.org?._id !== myOrg?._id).length === 0) && (
              <div className="col-span-full text-center py-12">
                <Target className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Sem praccs disponíveis de momento</p>
                <p className="text-zinc-600 text-sm mt-1">Cria um pedido para outras equipas te encontrarem</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Praccs Tab */}
      {activeTab === "my-praccs" && (
        <div className="space-y-4">
          {myPraccs?.map((pracc: any) => (
            <div key={pracc._id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(pracc.status)}`}>
                    {pracc.status}
                  </span>
                  <div>
                    <p className="font-medium text-white">
                      {pracc.opponent ? `vs ${pracc.opponent.name}` : "À procura de oponente..."}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {formatDate(pracc.scheduledDate)} • {pracc.map || "Qualquer mapa"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {pracc.status === "MATCHED" && (
                    <button
                      onClick={() => handleConfirm(pracc._id)}
                      className="px-4 py-2 rounded-lg bg-green-500 text-white font-medium hover:bg-green-400 transition-colors"
                    >
                      Confirmar & Iniciar
                    </button>
                  )}
                  {pracc.status === "LIVE" && pracc.serverIp && (
                    <span className="px-4 py-2 rounded-lg bg-zinc-800 text-white font-mono">
                      {pracc.serverIp}
                    </span>
                  )}
                  {(pracc.status === "OPEN" || pracc.status === "MATCHED") && (
                    <button
                      onClick={() => handleCancel(pracc._id)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {(!myPraccs || myPraccs.length === 0) && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Sem praccs agendados</p>
            </div>
          )}
        </div>
      )}

      {/* Demos Tab */}
      {activeTab === "demos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myDemos?.map((demo: any) => (
            <div key={demo._id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <FileVideo className="w-8 h-8 text-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{demo.fileName}</p>
                  <p className="text-sm text-zinc-500">{demo.map}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-zinc-500 mb-3">
                <span>{demo.fileSize ? `${(demo.fileSize / 1024 / 1024).toFixed(1)} MB` : "—"}</span>
                <span>{formatDate(demo.uploadedAt)}</span>
              </div>

              <a
                href={demo.fileUrl}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Download
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          ))}

          {(!myDemos || myDemos.length === 0) && (
            <div className="col-span-full text-center py-12">
              <FileVideo className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Sem demos disponíveis</p>
              <p className="text-zinc-600 text-sm mt-1">As demos dos praccs aparecerão aqui</p>
            </div>
          )}
        </div>
      )}

      {/* Create Pracc Modal */}
      {showCreateModal && (
        <CreatePraccModal 
          orgId={myOrg._id as Id<"organizations">} 
          onClose={() => setShowCreateModal(false)} 
        />
      )}
    </div>
  );
}

function CreatePraccModal({ orgId, onClose }: { orgId: Id<"organizations">; onClose: () => void }) {
  const [formData, setFormData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    duration: 60,
    map: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const createPracc = useMutation(api.praccs.createPraccRequest);
  const maps = ["de_ancient", "de_anubis", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_vertigo"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scheduledDate || !formData.scheduledTime) {
      alert("Data e hora são obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const scheduledDate = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).getTime();
      
      await createPracc({
        orgId,
        scheduledDate: BigInt(scheduledDate) as unknown as bigint,
        duration: formData.duration,
        map: formData.map || undefined,
        notes: formData.notes || undefined,
      });
      
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-white mb-4">Criar Pedido de Pracc</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Data</label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Hora</label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Duração</label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
            >
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h 30min</option>
              <option value={120}>2 horas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Mapa (opcional)</label>
            <select
              value={formData.map}
              onChange={(e) => setFormData({ ...formData, map: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
            >
              <option value="">Qualquer mapa</option>
              {maps.map((map) => (
                <option key={map} value={map}>{map}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Queremos treinar executes..."
              className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Pracc"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
