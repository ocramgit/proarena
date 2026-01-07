"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Coins, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * FASE 50: BALANCE HEADER - PREMIUM CTA
 * Mostra saldo de Soberanas (Ⓢ) no header
 * Dropdown com histórico + botão CTA para loja
 * Estilo: AAA Gaming Premium com acentos dourados
 */

export function BalanceHeader() {
  const router = useRouter();
  const balance = useQuery(api.economy.getBalance);
  const transactions = useQuery(api.economy.getTransactionHistory, { limit: 10 });

  if (!balance) return null;

  const handleAddFunds = () => {
    router.push("/shop");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-zinc-900/80 to-zinc-800/50 border border-yellow-500/30 hover:border-yellow-500/60 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Coins className="w-4 h-4 text-yellow-500 group-hover:animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-yellow-500/20 rounded-full blur-sm group-hover:bg-yellow-500/40 transition-colors" />
            </div>
            <span className="text-sm font-bold text-white">{balance.balance.toFixed(0)}</span>
            <span className="text-xs text-yellow-500/80 font-semibold">{balance.symbol}</span>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-1 text-yellow-500 group-hover:text-yellow-400 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs font-bold hidden sm:inline">ADICIONAR</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-zinc-400 uppercase font-bold mb-1">Saldo</div>
              <div className="text-2xl font-black text-white">
                {balance.balance.toFixed(0)} {balance.symbol}
              </div>
            </div>
            <Coins className="w-8 h-8 text-yellow-500" />
          </div>

          {/* Premium CTA Button */}
          <button
            onClick={handleAddFunds}
            className="w-full mb-4 py-3 px-4 rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold text-sm uppercase tracking-wide transition-all duration-300 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Comprar Soberanas
          </button>

          <div className="border-t border-zinc-800 pt-3">
            <div className="text-xs text-zinc-400 uppercase font-bold mb-2">Histórico Recente</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-2 rounded bg-zinc-800/50"
                  >
                    <div className="flex-1">
                      <div className="text-xs text-zinc-300">{tx.description}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(Number(tx.timestamp)).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        tx.amount > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toFixed(0)} {balance.symbol}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 text-center py-4">
                  Sem transações recentes
                </div>
              )}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
