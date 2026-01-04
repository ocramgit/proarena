"use client";

import { Button } from "@/components/ui/button";
import { Gamepad2, Trophy, Shield, Zap } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-950" />
        
        <div className="relative z-10">
          <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                  <Gamepad2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-black uppercase tracking-tight text-zinc-100">
                  ProArena
                </span>
              </div>
              <SignInButton mode="modal">
                <Button size="lg" className="font-bold uppercase">
                  Entrar / Registar
                </Button>
              </SignInButton>
            </div>
          </nav>

          <div className="container mx-auto px-6 py-24">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mb-6 text-7xl font-black uppercase tracking-tight text-zinc-100">
                Plataforma Competitiva
                <span className="block text-orange-600">Counter-Strike 2</span>
              </h1>
              <p className="mb-12 text-xl text-zinc-400">
                Matchmaking profissional com sistema ELO, anti-cheat e servidores dedicados.
                Joga 1v1 ou 5v5 e sobe no ranking.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="h-14 px-12 text-lg font-black uppercase">
                  Começar Agora
                </Button>
              </SignInButton>
            </div>

            <div className="mt-24 grid gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-faceit-panel p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-600/10">
                  <Trophy className="h-7 w-7 text-orange-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-zinc-100">Sistema ELO</h3>
                <p className="text-zinc-400">
                  Ranking competitivo justo baseado no teu desempenho. Sobe de rank e prova que és o melhor.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-faceit-panel p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-600/10">
                  <Shield className="h-7 w-7 text-orange-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-zinc-100">Anti-Cheat</h3>
                <p className="text-zinc-400">
                  Sistema de reports e moderação ativa. Joga num ambiente limpo e competitivo.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-faceit-panel p-8">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-600/10">
                  <Zap className="h-7 w-7 text-orange-600" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-zinc-100">Matchmaking Rápido</h3>
                <p className="text-zinc-400">
                  Encontra partidas em segundos. Sistema de fila otimizado para tempos de espera mínimos.
                </p>
              </div>
            </div>

            <div className="mt-24 rounded-xl border border-zinc-800 bg-faceit-panel p-12 text-center">
              <h2 className="mb-4 text-3xl font-black uppercase text-zinc-100">
                Pronto para competir?
              </h2>
              <p className="mb-8 text-lg text-zinc-400">
                Cria a tua conta e começa a jogar agora mesmo.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="h-14 px-12 text-lg font-black uppercase">
                  Criar Conta Grátis
                </Button>
              </SignInButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
