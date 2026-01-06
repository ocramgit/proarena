"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Coins, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * MEGA ATUALIZAÇÃO: BALANCE HEADER
 * Mostra saldo de Soberanas (Ⓢ) no header
 * Dropdown com histórico de transações
 * Estilo: Faceit / Vercel Dark Mode
 */

export function BalanceHeader() {
  const balance = useQuery(api.economy.getBalance);
  const transactions = useQuery(api.economy.getTransactionHistory, { limit: 10 });

  if (!balance) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-bold text-white">{balance.balance.toFixed(0)}</span>
          <span className="text-xs text-zinc-400">{balance.symbol}</span>
          <ChevronDown className="w-3 h-3 text-zinc-500" />
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

          <div className="border-t border-zinc-800 pt-3">
            <div className="text-xs text-zinc-400 uppercase font-bold mb-2">Histórico Recente</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
