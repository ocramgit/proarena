"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sidebar } from "@/components/layout/sidebar";
import { 
  Trophy, 
  ChevronLeft, 
  ChevronRight,
  Check,
  Info,
  Calendar,
  Users,
  Shuffle,
  GripVertical,
  BarChart3,
  Gift,
  Coins,
  Lock,
  AlertCircle
} from "lucide-react";

/**
 * FASE 51: TOURNAMENT CREATION WIZARD
 * 3-step wizard for organizers
 */

type Step = 1 | 2 | 3;
type GameMode = "1v1" | "2v2" | "5v5";
type SeedType = "RANDOM" | "MANUAL" | "ELO";
type PrizeMode = "CUSTOM" | "SOBERANAS";

interface TournamentData {
  // Step 1
  name: string;
  description: string;
  bannerUrl: string;
  startDate: string;
  startTime: string;
  checkInMinutes: number;
  mode: GameMode;
  maxTeams: number;
  // Step 2
  seedType: SeedType;
  // Step 3
  prizeMode: PrizeMode;
  prize1st: string;
  prize2nd: string;
  prize3rd: string;
  prizePool: number;
  buyIn: number;
  distribution: number[];
}

const TEAM_OPTIONS = [4, 8, 16, 32, 64];
const MODE_OPTIONS: { value: GameMode; label: string; players: string }[] = [
  { value: "1v1", label: "1v1 Duel", players: "1 jogador" },
  { value: "2v2", label: "2v2 Teams", players: "2 jogadores" },
  { value: "5v5", label: "5v5 Competitive", players: "5 jogadores" },
];

export default function CreateTournamentPage() {
  const router = useRouter();
  const canOrganize = useQuery(api.tournaments.canOrganize);
  const createTournament = useMutation(api.tournaments.createTournament);
  const publishTournament = useMutation(api.tournaments.publishTournament);

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<TournamentData>({
    name: "",
    description: "",
    bannerUrl: "",
    startDate: "",
    startTime: "",
    checkInMinutes: 30,
    mode: "1v1",
    maxTeams: 8,
    seedType: "RANDOM",
    prizeMode: "CUSTOM",
    prize1st: "",
    prize2nd: "",
    prize3rd: "",
    prizePool: 0,
    buyIn: 0,
    distribution: [50, 30, 20],
  });

  // Redirect if not organizer
  if (canOrganize === false) {
    return (
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Sidebar />
        <div className="flex-1 ml-64 pt-14 flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
            <p className="text-zinc-400 mb-4">Apenas ORGANIZER ou ADMIN podem criar torneios.</p>
            <button
              onClick={() => router.push("/tournaments")}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const updateData = (updates: Partial<TournamentData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setError(null);
  };

  const validateStep = (s: Step): boolean => {
    switch (s) {
      case 1:
        if (!data.name.trim()) {
          setError("Nome do torneio é obrigatório");
          return false;
        }
        if (!data.startDate || !data.startTime) {
          setError("Data e hora de início são obrigatórias");
          return false;
        }
        return true;
      case 2:
        return true; // Seed type always valid
      case 3:
        if (data.prizeMode === "CUSTOM" && !data.prize1st.trim()) {
          setError("Prémio do 1º lugar é obrigatório");
          return false;
        }
        if (data.prizeMode === "SOBERANAS" && data.prizePool <= 0) {
          setError("Prize pool deve ser maior que 0");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((step + 1) as Step);
    }
  };

  const prevStep = () => {
    setStep((step - 1) as Step);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      
      const tournamentId = await createTournament({
        name: data.name,
        description: data.description || undefined,
        bannerUrl: data.bannerUrl || undefined,
        startDate: BigInt(startDateTime.getTime()),
        checkInMinutes: data.checkInMinutes,
        mode: data.mode,
        maxTeams: data.maxTeams,
        seedType: data.seedType,
        prizeMode: data.prizeMode,
        prize1st: data.prizeMode === "CUSTOM" ? data.prize1st : undefined,
        prize2nd: data.prizeMode === "CUSTOM" ? data.prize2nd : undefined,
        prize3rd: data.prizeMode === "CUSTOM" ? data.prize3rd : undefined,
        prizePool: data.prizeMode === "SOBERANAS" ? data.prizePool : undefined,
        buyIn: data.prizeMode === "SOBERANAS" ? data.buyIn : undefined,
        distribution: data.prizeMode === "SOBERANAS" ? data.distribution : undefined,
      });

      // Auto-publish
      await publishTournament({ tournamentId });

      router.push(`/tournaments/${tournamentId}`);
    } catch (err: any) {
      setError(err.message || "Erro ao criar torneio");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 ml-64 pt-14 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push("/tournaments")}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Criar Torneio
              </h1>
              <p className="text-zinc-400 text-sm">Passo {step} de 3</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                  s < step ? "bg-green-500 text-white" :
                  s === step ? "bg-orange-500 text-white" :
                  "bg-zinc-800 text-zinc-500"
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                <span className={`text-sm hidden sm:block ${s === step ? "text-white" : "text-zinc-500"}`}>
                  {s === 1 ? "Informações" : s === 2 ? "Seeds" : "Prémios"}
                </span>
                {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? "bg-green-500" : "bg-zinc-800"}`} />}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* Step Content */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            {/* STEP 1: General Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Nome do Torneio *
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => updateData({ name: e.target.value })}
                    placeholder="Ex: ProArena Weekly Cup #1"
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={data.description}
                    onChange={(e) => updateData({ description: e.target.value })}
                    placeholder="Descrição opcional do torneio..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={data.startDate}
                      onChange={(e) => updateData({ startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Hora de Início *
                    </label>
                    <input
                      type="time"
                      value={data.startTime}
                      onChange={(e) => updateData({ startTime: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Check-in abre (minutos antes)
                  </label>
                  <select
                    value={data.checkInMinutes}
                    onChange={(e) => updateData({ checkInMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Modo de Jogo
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => updateData({ mode: mode.value })}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          data.mode === mode.value
                            ? "bg-orange-500/20 border-orange-500 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        }`}
                      >
                        <div className="font-bold">{mode.label}</div>
                        <div className="text-xs opacity-70">{mode.players}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Número de Equipas/Jogadores
                  </label>
                  <div className="flex gap-2">
                    {TEAM_OPTIONS.map((num) => (
                      <button
                        key={num}
                        onClick={() => updateData({ maxTeams: num })}
                        className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                          data.maxTeams === num
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Seeding */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm text-zinc-400">
                    O seeding define como as equipas são emparelhadas na primeira ronda.
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => updateData({ seedType: "RANDOM" })}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      data.seedType === "RANDOM"
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shuffle className="w-6 h-6 text-orange-500" />
                      <div>
                        <div className="font-bold text-white">Aleatório</div>
                        <div className="text-sm text-zinc-400">O sistema baralha as equipas automaticamente</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => updateData({ seedType: "MANUAL" })}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      data.seedType === "MANUAL"
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-6 h-6 text-blue-500" />
                      <div>
                        <div className="font-bold text-white">Manual</div>
                        <div className="text-sm text-zinc-400">Arrasta as equipas para os slots manualmente</div>
                      </div>
                    </div>
                  </button>

                  <button
                    disabled
                    className="w-full p-4 rounded-lg border bg-zinc-800/50 border-zinc-700 text-left opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-6 h-6 text-zinc-600" />
                      <div>
                        <div className="font-bold text-zinc-500">Elo-Based</div>
                        <div className="text-sm text-zinc-600">High Elo vs Low Elo (Em breve)</div>
                      </div>
                      <Lock className="w-4 h-4 text-zinc-600 ml-auto" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Prizes */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Prize Mode Toggle */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateData({ prizeMode: "CUSTOM" })}
                    className={`p-4 rounded-lg border text-center transition-colors ${
                      data.prizeMode === "CUSTOM"
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <Gift className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                    <div className="font-bold text-white">Prémios Custom</div>
                    <div className="text-xs text-zinc-400">Texto livre</div>
                  </button>

                  <button
                    onClick={() => updateData({ prizeMode: "SOBERANAS" })}
                    className={`p-4 rounded-lg border text-center transition-colors ${
                      data.prizeMode === "SOBERANAS"
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    <Coins className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <div className="font-bold text-white">Soberanas</div>
                    <div className="text-xs text-zinc-400">Distribuição automática</div>
                  </button>
                </div>

                {/* Custom Prizes */}
                {data.prizeMode === "CUSTOM" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        🥇 1º Lugar *
                      </label>
                      <input
                        type="text"
                        value={data.prize1st}
                        onChange={(e) => updateData({ prize1st: e.target.value })}
                        placeholder="Ex: AK-47 Asiimov"
                        className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        🥈 2º Lugar
                      </label>
                      <input
                        type="text"
                        value={data.prize2nd}
                        onChange={(e) => updateData({ prize2nd: e.target.value })}
                        placeholder="Ex: 20€ Steam Card"
                        className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        🥉 3º Lugar
                      </label>
                      <input
                        type="text"
                        value={data.prize3rd}
                        onChange={(e) => updateData({ prize3rd: e.target.value })}
                        placeholder="Ex: Badge Exclusiva"
                        className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {/* Soberanas Prizes */}
                {data.prizeMode === "SOBERANAS" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Prize Pool Total (Ⓢ)
                        </label>
                        <input
                          type="number"
                          value={data.prizePool || ""}
                          onChange={(e) => updateData({ prizePool: Number(e.target.value) })}
                          placeholder="1000"
                          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                          Buy-in por equipa (Ⓢ)
                        </label>
                        <input
                          type="number"
                          value={data.buyIn || ""}
                          onChange={(e) => updateData({ buyIn: Number(e.target.value) })}
                          placeholder="0 (gratuito)"
                          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-3">
                        Distribuição (%)
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-center text-yellow-500 mb-1">🥇 1º</div>
                          <input
                            type="number"
                            value={data.distribution[0]}
                            onChange={(e) => updateData({ 
                              distribution: [Number(e.target.value), data.distribution[1], data.distribution[2]] 
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <div className="text-center text-zinc-400 mb-1">🥈 2º</div>
                          <input
                            type="number"
                            value={data.distribution[1]}
                            onChange={(e) => updateData({ 
                              distribution: [data.distribution[0], Number(e.target.value), data.distribution[2]] 
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div>
                          <div className="text-center text-orange-400 mb-1">🥉 3º</div>
                          <input
                            type="number"
                            value={data.distribution[2]}
                            onChange={(e) => updateData({ 
                              distribution: [data.distribution[0], data.distribution[1], Number(e.target.value)] 
                            })}
                            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-center focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                      {data.distribution.reduce((a, b) => a + b, 0) !== 100 && (
                        <div className="mt-2 text-xs text-red-400">
                          A soma deve ser 100% (atual: {data.distribution.reduce((a, b) => a + b, 0)}%)
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    {data.prizePool > 0 && (
                      <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                        <div className="text-sm font-medium text-zinc-300 mb-2">Pré-visualização:</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-yellow-500">🥇 1º Lugar:</span>
                            <span className="text-white font-bold">{(data.prizePool * data.distribution[0] / 100).toFixed(0)} Ⓢ</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">🥈 2º Lugar:</span>
                            <span className="text-white">{(data.prizePool * data.distribution[1] / 100).toFixed(0)} Ⓢ</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-orange-400">🥉 3º Lugar:</span>
                            <span className="text-white">{(data.prizePool * data.distribution[2] / 100).toFixed(0)} Ⓢ</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-400"
              >
                Seguinte
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-400 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    A criar...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Criar e Publicar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
