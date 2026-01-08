"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Coins,
  Plus,
  Loader2,
  AlertCircle,
  Swords,
  Clock,
  Trophy,
  X,
  Wallet,
  Target,
  Users,
  CheckCircle,
  Zap,
  History
} from "lucide-react";

/**
 * FASE 54: WAGERS (P2P BETTING) PAGE
 * Play for money with automatic settlement
 */

export default function WagersPage() {
  const balance = useQuery(api.wagers.getMyBalance);
  const openWagers = useQuery(api.wagers.getOpenWagers);
  const myWagers = useQuery(api.wagers.getMyWagers);
  const wagerMaps = useQuery(api.wagers.getWagerMaps);

  const createWager = useMutation(api.wagers.createWager);
  const joinWager = useMutation(api.wagers.joinWager);
  const cancelWager = useMutation(api.wagers.cancelWager);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newWager, setNewWager] = useState({
    map: "aim_map",
    mode: "1v1" as "1v1" | "2v2",
    betAmount: 500,
  });

  const handleCreateWager = async () => {
    setError(null);
    setIsCreating(true);

    try {
      await createWager({
        map: newWager.map,
        mode: newWager.mode,
        betAmount: newWager.betAmount,
      });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinWager = async (wagerId: Id<"wagers">) => {
    setError(null);
    setIsJoining(wagerId);

    try {
      await joinWager({ wagerId });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsJoining(null);
    }
  };

  const handleCancelWager = async (wagerId: Id<"wagers">) => {
    if (!confirm("Tens a certeza que queres cancelar este wager?")) return;

    try {
      await cancelWager({ wagerId });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING":
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">À Espera</span>;
      case "LOCKED":
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Locked</span>;
      case "LIVE":
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 animate-pulse">LIVE</span>;
      case "FINISHED":
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-500/20 text-zinc-400">Terminado</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">Cancelado</span>;
      default:
        return null;
    }
  };

  const formatTimeRemaining = (expiresAt: bigint) => {
    const remaining = Number(expiresAt) - Date.now();
    if (remaining <= 0) return "Expirado";
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // My active wagers
  const activeWagers = myWagers?.filter((w) => 
    ["WAITING", "LOCKED", "LIVE"].includes(w.status)
  ) || [];

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Wagers</h1>
                <p className="text-zinc-400">Joga a dinheiro • Taxa de serviço: 10%</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Balance Display */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
                <Wallet className="w-5 h-5 text-yellow-500" />
                <span className="text-white font-bold">{balance?.toLocaleString() ?? 0} Ⓢ</span>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg shadow-orange-500/25"
              >
                <Plus className="w-5 h-5" />
                Criar Wager
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* My Active Wagers */}
          {activeWagers.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Os Meus Wagers Ativos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeWagers.map((wager) => (
                  <div
                    key={wager._id}
                    className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{wager.map}</span>
                        {getStatusBadge(wager.status)}
                      </div>
                      <span className="text-xl font-black text-yellow-500">{wager.betAmount} Ⓢ</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <img
                          src={wager.creator?.steamAvatar || "/default-avatar.png"}
                          alt=""
                          className="w-6 h-6 rounded"
                        />
                        <span>{wager.creator?.nickname}</span>
                        <span className="text-zinc-600">vs</span>
                        {wager.opponent ? (
                          <>
                            <img
                              src={wager.opponent.steamAvatar || "/default-avatar.png"}
                              alt=""
                              className="w-6 h-6 rounded"
                            />
                            <span>{wager.opponent.nickname}</span>
                          </>
                        ) : (
                          <span className="text-zinc-600">À espera...</span>
                        )}
                      </div>

                      {wager.status === "WAITING" && (
                        <button
                          onClick={() => handleCancelWager(wager._id)}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}

                      {wager.status === "LIVE" && wager.matchId && (
                        <Link
                          href={`/match/${wager.matchId}`}
                          className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 transition-colors"
                        >
                          Ver Partida
                        </Link>
                      )}
                    </div>

                    {wager.status === "WAITING" && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        Expira em: {formatTimeRemaining(wager.expiresAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Wagers */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Swords className="w-5 h-5 text-orange-500" />
              Wagers Disponíveis
            </h2>

            {openWagers && openWagers.length > 0 ? (
              <div className="space-y-3">
                {openWagers.map((wager) => (
                  <div
                    key={wager._id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={wager.creator?.steamAvatar || "/default-avatar.png"}
                        alt=""
                        className="w-12 h-12 rounded-xl"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{wager.creator?.nickname}</span>
                          <span className="text-xs text-zinc-500">ELO: {wager.creator?.elo || 1000}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {wager.map}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {wager.mode}
                          </span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {formatTimeRemaining(wager.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-black text-yellow-500">{wager.betAmount} Ⓢ</p>
                        <p className="text-xs text-zinc-500">Prémio: {Math.floor(wager.betAmount * 2 * 0.9)} Ⓢ</p>
                      </div>
                      <button
                        onClick={() => handleJoinWager(wager._id)}
                        disabled={isJoining === wager._id || (balance ?? 0) < wager.betAmount}
                        className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isJoining === wager._id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Aceitar"
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <Swords className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 mb-4">Nenhum wager disponível</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar o Primeiro
                </button>
              </div>
            )}
          </div>

          {/* How it Works */}
          <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <h3 className="font-bold text-white mb-4">Como Funciona</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-500 font-bold">1</span>
                </div>
                <p className="text-sm text-zinc-400">Cria um wager com o valor desejado</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-500 font-bold">2</span>
                </div>
                <p className="text-sm text-zinc-400">O saldo é bloqueado automaticamente</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-yellow-500 font-bold">3</span>
                </div>
                <p className="text-sm text-zinc-400">Quando alguém aceita, o servidor inicia</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                  <Trophy className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-sm text-zinc-400">Vencedor recebe 90% do pot</p>
              </div>
            </div>
          </div>

          {/* History Link */}
          <div className="mt-6 text-center">
            <Link
              href="/wagers/history"
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <History className="w-4 h-4" />
              Ver Histórico de Wagers
            </Link>
          </div>
        </div>
      </div>

      {/* Create Wager Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                Criar Wager
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Map Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Mapa</label>
                <div className="grid grid-cols-2 gap-2">
                  {wagerMaps?.map((map) => (
                    <button
                      key={map.id}
                      onClick={() => setNewWager({ ...newWager, map: map.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        newWager.map === map.id
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <span className="text-white font-medium">{map.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bet Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Valor da Aposta</label>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setNewWager({ ...newWager, betAmount: amount })}
                      className={`py-2 rounded-lg font-bold transition-all ${
                        newWager.betAmount === amount
                          ? "bg-yellow-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {amount} Ⓢ
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={newWager.betAmount}
                  onChange={(e) => setNewWager({ ...newWager, betAmount: Number(e.target.value) })}
                  min={100}
                  className="mt-2 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-yellow-500"
                  placeholder="Valor personalizado"
                />
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Tua aposta:</span>
                  <span className="text-white font-bold">{newWager.betAmount} Ⓢ</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Pot total:</span>
                  <span className="text-white font-bold">{newWager.betAmount * 2} Ⓢ</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Taxa (10%):</span>
                  <span className="text-red-400">-{Math.floor(newWager.betAmount * 2 * 0.1)} Ⓢ</span>
                </div>
                <div className="h-px bg-zinc-700 my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-medium">Prémio (se venceres):</span>
                  <span className="text-green-400 font-black text-lg">
                    +{Math.floor(newWager.betAmount * 2 * 0.9) - newWager.betAmount} Ⓢ
                  </span>
                </div>
              </div>

              {/* Balance Check */}
              {(balance ?? 0) < newWager.betAmount && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  Saldo insuficiente. Tens {balance ?? 0} Ⓢ, precisas de {newWager.betAmount} Ⓢ
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWager}
                disabled={isCreating || (balance ?? 0) < newWager.betAmount}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Criar Wager
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
