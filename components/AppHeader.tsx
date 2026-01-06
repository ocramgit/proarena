"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Trophy, LogOut, User, Settings } from "lucide-react";
import { BalanceHeader } from "./BalanceHeader";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useClerk } from "@clerk/nextjs";

/**
 * FASE 29: APP HEADER COM DROPDOWN
 * Header global com dropdown menu para perfil
 * Estilo: Faceit / Vercel Dark Mode
 */

export function AppHeader() {
  const router = useRouter();
  const { signOut } = useClerk();
  const currentUser = useQuery(api.users.getCurrentUser);

  if (!currentUser) return null;

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    router.push("/settings");
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Trophy className="w-6 h-6 text-orange-500" />
          <span className="text-xl font-black text-white uppercase tracking-tight">
            ProArena
          </span>
        </button>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Balance */}
          <BalanceHeader />

          {/* Notifications */}
          <NotificationBell />

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {(currentUser.steamName || "?")[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-zinc-300">
                  {currentUser.steamName || "Jogador"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
              <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Definições
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-400 focus:text-red-300">
                <LogOut className="w-4 h-4 mr-2" />
                Terminar Sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
