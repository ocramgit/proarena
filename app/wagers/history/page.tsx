"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  History,
  Loader2,
  Trophy,
  XCircle,
  ChevronLeft,
  Coins,
  Target,
  Clock
} from "lucide-react";

/**
 * FASE 54: WAGER HISTORY PAGE
 * View past wagers and transactions
 */

export default function WagerHistoryPage() {
  const wagerHistory = useQuery(api.wagers.getWagerHistory, { limit: 50 });
  const transactions = useQuery(api.wagers.getMyTransactions, { limit: 50 });

  return (
    <div className="flex h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/wagers"
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                <History className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Histórico de Wagers</h1>
                <p className="text-zinc-400">As tuas apostas e transações passadas</p>
              </div>
            </div>
          </div>

          {/* Wager History */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              Wagers Terminados
            </h2>

            {wagerHistory === undefined ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : wagerHistory.length > 0 ? (
              <div className="space-y-3">
                {wagerHistory.map((wager) => (
                  <div
                    key={wager._id}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      wager.isWinner
                        ? "bg-green-500/5 border-green-500/30"
                        : "bg-red-500/5 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        wager.isWinner ? "bg-green-500/20" : "bg-red-500/20"
                      }`}>
                        {wager.isWinner ? (
                          <Trophy className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {wager.creator?.nickname} vs {wager.opponent?.nickname}
                          </span>
                          <span className={`text-xs font-bold ${
                            wager.isWinner ? "text-green-400" : "text-red-400"
                          }`}>
                            {wager.isWinner ? "VITÓRIA" : "DERROTA"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {wager.map}
                          </span>
                          <span>
                            {wager.winnerScore}-{wager.loserScore}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(Number(wager.settledAt || wager.createdAt)).toLocaleDateString("pt-PT")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-xl font-black ${
                        wager.isWinner ? "text-green-500" : "text-red-500"
                      }`}>
                        {wager.isWinner ? `+${wager.winnerPrize}` : `-${wager.betAmount}`} Ⓢ
                      </p>
                      <p className="text-xs text-zinc-500">
                        Pot: {wager.totalPot} Ⓢ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Sem wagers terminados</p>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              Transações
            </h2>

            {transactions === undefined ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-zinc-500 border-b border-zinc-800">
                      <th className="text-left p-4 font-medium">Tipo</th>
                      <th className="text-left p-4 font-medium">Descrição</th>
                      <th className="text-right p-4 font-medium">Valor</th>
                      <th className="text-right p-4 font-medium">Saldo</th>
                      <th className="text-right p-4 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="border-b border-zinc-800/50">
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            tx.type === "WIN" ? "bg-green-500/20 text-green-400" :
                            tx.type === "LOCK" ? "bg-blue-500/20 text-blue-400" :
                            tx.type === "UNLOCK" || tx.type === "REFUND" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-zinc-500/20 text-zinc-400"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-300 text-sm">{tx.description}</td>
                        <td className={`p-4 text-right font-bold ${
                          tx.type === "WIN" || tx.type === "UNLOCK" || tx.type === "REFUND"
                            ? "text-green-500" : "text-red-500"
                        }`}>
                          {tx.type === "WIN" || tx.type === "UNLOCK" || tx.type === "REFUND" ? "+" : "-"}
                          {tx.amount} Ⓢ
                        </td>
                        <td className="p-4 text-right text-zinc-400">{tx.balanceAfter} Ⓢ</td>
                        <td className="p-4 text-right text-zinc-500 text-sm">
                          {new Date(Number(tx.createdAt)).toLocaleString("pt-PT")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl bg-zinc-900/50 border border-zinc-800">
                <History className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Sem transações</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
