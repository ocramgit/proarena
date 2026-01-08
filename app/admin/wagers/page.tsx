"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Coins,
  Loader2,
  AlertCircle,
  RefreshCcw,
  Trophy,
  X,
  XCircle,
  CheckCircle,
  Eye,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Ban,
  Crown,
  FileText
} from "lucide-react";

/**
 * FASE 54: ADMIN WAGER MANAGEMENT
 * Cancel/Refund, Force Winner, View Details
 */

export default function AdminWagersPage() {
  const isAdmin = useQuery(api.admin.isAdmin);
  const wagers = useQuery(api.wagerAdmin.getAllWagers, { limit: 100 });
  const revenueStats = useQuery(api.wagerAdmin.getRevenueStats);
  const recentTransactions = useQuery(api.wagerAdmin.getRecentTransactions, { limit: 20 });

  const cancelAndRefund = useMutation(api.wagerAdmin.adminCancelAndRefund);
  const forceWinner = useMutation(api.wagerAdmin.adminForceWinner);
  const markDisputed = useMutation(api.wagerAdmin.adminMarkDisputed);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedWager, setSelectedWager] = useState<any>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showForceWinnerModal, setShowForceWinnerModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [forceWinnerData, setForceWinnerData] = useState({
    winnerId: "" as string,
    applyFee: true,
    reason: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Not authorized
  if (isAdmin === false) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">403 - Acesso Negado</h1>
            <p className="text-zinc-400">Apenas ADMIN pode aceder a esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (isAdmin === undefined || wagers === undefined) {
    return (
      <div className="flex h-screen bg-zinc-950">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  const filteredWagers = statusFilter === "ALL" 
    ? wagers 
    : wagers.filter((w: any) => w.status === statusFilter);

  const handleCancelRefund = async () => {
    if (!selectedWager || !refundReason.trim()) return;
    setIsProcessing(true);
    try {
      await cancelAndRefund({ wagerId: selectedWager._id, reason: refundReason });
      setShowRefundModal(false);
      setSelectedWager(null);
      setRefundReason("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceWinner = async () => {
    if (!selectedWager || !forceWinnerData.winnerId || !forceWinnerData.reason.trim()) return;
    setIsProcessing(true);
    try {
      await forceWinner({
        wagerId: selectedWager._id,
        winnerId: forceWinnerData.winnerId as Id<"users">,
        applyFee: forceWinnerData.applyFee,
        reason: forceWinnerData.reason,
      });
      setShowForceWinnerModal(false);
      setSelectedWager(null);
      setForceWinnerData({ winnerId: "", applyFee: true, reason: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
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
      case "DISPUTED":
        return <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">Disputa</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Coins className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Gestão de Wagers</h1>
              <p className="text-zinc-400">Gerir apostas, reembolsos e disputas</p>
            </div>
          </div>

          {/* Revenue Stats */}
          {revenueStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <DollarSign className="w-4 h-4" />
                  Receita Total
                </div>
                <p className="text-2xl font-black text-green-500">{revenueStats.totalRevenue.toLocaleString()} Ⓢ</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Total Apostado
                </div>
                <p className="text-2xl font-black text-yellow-500">{revenueStats.totalWagered.toLocaleString()} Ⓢ</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Total Wagers
                </div>
                <p className="text-2xl font-black text-white">{revenueStats.totalWagers}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Wagers Ativos
                </div>
                <p className="text-2xl font-black text-blue-500">{revenueStats.activeWagers}</p>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 mb-6">
            {["ALL", "WAITING", "LOCKED", "LIVE", "FINISHED", "CANCELLED", "DISPUTED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {status === "ALL" ? "Todos" : status}
              </button>
            ))}
          </div>

          {/* Wagers Table */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-zinc-500 border-b border-zinc-800">
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">Jogadores</th>
                  <th className="text-left p-4 font-medium">Mapa</th>
                  <th className="text-left p-4 font-medium">Valor</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Vencedor</th>
                  <th className="text-right p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredWagers.map((wager: any) => (
                  <tr key={wager._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-4">
                      <code className="text-xs text-zinc-500">#{wager._id.slice(-6)}</code>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <img
                            src={wager.creator?.steamAvatar || "/default-avatar.png"}
                            alt=""
                            className="w-6 h-6 rounded"
                          />
                          <span className="text-white text-sm">{wager.creator?.nickname}</span>
                        </div>
                        <span className="text-zinc-600">vs</span>
                        {wager.opponent ? (
                          <div className="flex items-center gap-1">
                            <img
                              src={wager.opponent.steamAvatar || "/default-avatar.png"}
                              alt=""
                              className="w-6 h-6 rounded"
                            />
                            <span className="text-white text-sm">{wager.opponent.nickname}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300">{wager.map}</td>
                    <td className="p-4">
                      <span className="text-yellow-500 font-bold">{wager.betAmount} Ⓢ</span>
                      <span className="text-zinc-600 text-xs ml-1">(pot: {wager.totalPot})</span>
                    </td>
                    <td className="p-4">{getStatusBadge(wager.status)}</td>
                    <td className="p-4">
                      {wager.winner ? (
                        <div className="flex items-center gap-1">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <span className="text-white text-sm">{wager.winner.nickname}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedWager(wager)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {["WAITING", "LOCKED", "LIVE", "DISPUTED"].includes(wager.status) && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedWager(wager);
                                setShowRefundModal(true);
                              }}
                              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Cancelar & Reembolsar"
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWager(wager);
                                setShowForceWinnerModal(true);
                              }}
                              className="p-2 rounded-lg text-zinc-400 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                              title="Forçar Vencedor"
                            >
                              <Trophy className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredWagers.length === 0 && (
              <div className="p-8 text-center">
                <Coins className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Nenhum wager encontrado</p>
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Transações Recentes
              </h2>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentTransactions?.map((tx: any) => (
                <div
                  key={tx._id}
                  className="flex items-center justify-between p-3 border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${
                      tx.type === "WIN" ? "bg-green-500/20 text-green-500" :
                      tx.type === "LOCK" ? "bg-blue-500/20 text-blue-500" :
                      tx.type === "UNLOCK" || tx.type === "REFUND" ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-zinc-500/20 text-zinc-500"
                    }`}>
                      {tx.type === "WIN" ? <Trophy className="w-4 h-4" /> :
                       tx.type === "LOCK" ? <Clock className="w-4 h-4" /> :
                       <RefreshCcw className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white">{tx.userName}</p>
                      <p className="text-xs text-zinc-500">{tx.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === "WIN" || tx.type === "UNLOCK" || tx.type === "REFUND" 
                        ? "text-green-500" : "text-red-500"
                    }`}>
                      {tx.type === "WIN" || tx.type === "UNLOCK" || tx.type === "REFUND" ? "+" : "-"}
                      {tx.amount} Ⓢ
                    </p>
                    <p className="text-xs text-zinc-600">
                      {new Date(Number(tx.createdAt)).toLocaleString("pt-PT")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedWager && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <RefreshCcw className="w-5 h-5 text-yellow-500" />
                Cancelar & Reembolsar
              </h2>
              <button onClick={() => setShowRefundModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400 mb-2">Wager #{selectedWager._id.slice(-6)}</p>
              <p className="text-white">{selectedWager.creator?.nickname} vs {selectedWager.opponent?.nickname || "—"}</p>
              <p className="text-yellow-500 font-bold">{selectedWager.totalPot} Ⓢ total</p>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm mb-4">
              100% do valor será devolvido a ambos os jogadores.
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Razão *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ex: Servidor crashou, bug no jogo..."
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancelRefund}
                disabled={isProcessing || !refundReason.trim()}
                className="flex-1 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Reembolsar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Winner Modal */}
      {showForceWinnerModal && selectedWager && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-500" />
                Forçar Vencedor
              </h2>
              <button onClick={() => setShowForceWinnerModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-800/50 mb-4">
              <p className="text-sm text-zinc-400 mb-2">Wager #{selectedWager._id.slice(-6)}</p>
              <p className="text-yellow-500 font-bold">{selectedWager.totalPot} Ⓢ pot</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Selecionar Vencedor *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setForceWinnerData({ ...forceWinnerData, winnerId: selectedWager.creatorId })}
                    className={`p-3 rounded-lg border flex items-center gap-2 ${
                      forceWinnerData.winnerId === selectedWager.creatorId
                        ? "border-green-500 bg-green-500/10"
                        : "border-zinc-700 bg-zinc-800"
                    }`}
                  >
                    <img
                      src={selectedWager.creator?.steamAvatar || "/default-avatar.png"}
                      alt=""
                      className="w-8 h-8 rounded"
                    />
                    <span className="text-white text-sm">{selectedWager.creator?.nickname}</span>
                  </button>
                  {selectedWager.opponentId && (
                    <button
                      onClick={() => setForceWinnerData({ ...forceWinnerData, winnerId: selectedWager.opponentId })}
                      className={`p-3 rounded-lg border flex items-center gap-2 ${
                        forceWinnerData.winnerId === selectedWager.opponentId
                          ? "border-green-500 bg-green-500/10"
                          : "border-zinc-700 bg-zinc-800"
                      }`}
                    >
                      <img
                        src={selectedWager.opponent?.steamAvatar || "/default-avatar.png"}
                        alt=""
                        className="w-8 h-8 rounded"
                      />
                      <span className="text-white text-sm">{selectedWager.opponent?.nickname}</span>
                    </button>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={forceWinnerData.applyFee}
                  onChange={(e) => setForceWinnerData({ ...forceWinnerData, applyFee: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500"
                />
                <span className="text-sm text-zinc-300">Aplicar taxa de 10% ({Math.floor(selectedWager.totalPot * 0.1)} Ⓢ)</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Razão *</label>
                <textarea
                  value={forceWinnerData.reason}
                  onChange={(e) => setForceWinnerData({ ...forceWinnerData, reason: e.target.value })}
                  placeholder="Ex: Cheater confirmado, ghosting..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForceWinnerModal(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleForceWinner}
                disabled={isProcessing || !forceWinnerData.winnerId || !forceWinnerData.reason.trim()}
                className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                Forçar Vitória
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
