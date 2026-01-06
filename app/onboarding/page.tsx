"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Gamepad2, CheckCircle2, AlertCircle, ArrowRight, Loader2, Check, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"

/**
 * FASE 40: ONBOARDING WIZARD DE 2 PASSOS
 * Passo 1: Escolher Nickname único
 * Passo 2: Conectar Steam
 */

export default function OnboardingPage() {
  const router = useRouter()
  const currentUser = useQuery(api.users.getCurrentUser)
  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState("")
  const debouncedNickname = useDebounce(nickname, 500)
  
  const nicknameAvailable = useQuery(
    api.users.checkNicknameAvailable,
    debouncedNickname.length >= 3 ? { nickname: debouncedNickname } : "skip"
  )
  
  const setNicknameMutation = useMutation(api.users.setNickname)

  // Redirect if fully onboarded
  useEffect(() => {
    if (currentUser?.steamId && currentUser?.nickname) {
      router.push("/")
    }
  }, [currentUser, router])

  // Auto-advance to step 2 if nickname already set
  useEffect(() => {
    if (currentUser?.nickname && !currentUser?.steamId) {
      setStep(2)
    }
  }, [currentUser])

  const handleNicknameSubmit = async () => {
    if (!nickname || nickname.length < 3 || !nicknameAvailable) return
    
    try {
      await setNicknameMutation({ nickname })
      toast.success("Nickname definido!")
      setStep(2)
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir nickname")
    }
  }

  const handleFinish = () => {
    if (currentUser?.steamId && currentUser?.nickname) {
      router.push("/")
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  // Validation states
  const isNicknameValid = nickname.length >= 3 && /^[a-zA-Z0-9_]+$/.test(nickname)
  const showAvailability = debouncedNickname.length >= 3 && isNicknameValid

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 p-8 max-w-2xl w-full">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
          step >= 1 ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"
        }`}>
          {currentUser.nickname ? <Check className="w-4 h-4" /> : "1"}
        </div>
        <div className={`h-1 w-16 ${
          step >= 2 ? "bg-orange-600" : "bg-zinc-800"
        }`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
          step >= 2 ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-500"
        }`}>
          {currentUser.steamId ? <Check className="w-4 h-4" /> : "2"}
        </div>
      </div>

      {/* STEP 1: Nickname */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black text-white mb-2">Escolhe o teu Nickname</h1>
            <p className="text-zinc-400">Este será o teu @username na ProArena</p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-lg">
                @
              </div>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value.toLowerCase())}
                placeholder="nickname"
                className="pl-10 h-14 text-lg bg-zinc-800 border-zinc-700 text-white"
                maxLength={20}
                autoFocus
              />
            </div>

            {/* Validation Feedback */}
            {nickname.length > 0 && (
              <div className="space-y-1">
                {nickname.length < 3 && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> Mínimo 3 caracteres
                  </p>
                )}
                {!/^[a-zA-Z0-9_]+$/.test(nickname) && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> Apenas letras, números e _
                  </p>
                )}
                {showAvailability && nicknameAvailable === false && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <X className="w-3 h-3" /> Já está em uso
                  </p>
                )}
                {showAvailability && nicknameAvailable === true && (
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Disponível!
                  </p>
                )}
                {showAvailability && nicknameAvailable === undefined && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> A verificar...
                  </p>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleNicknameSubmit}
            disabled={!isNicknameValid || nicknameAvailable !== true}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-lg py-6"
          >
            Continuar
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {/* STEP 2: Steam */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-black text-white mb-2">Conecta a tua Steam</h1>
            <p className="text-zinc-400">Último passo para começares a jogar</p>
          </div>

          {currentUser.steamId ? (
            <div className="space-y-4">
              <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Steam Vinculado!</h3>
                <p className="text-sm text-zinc-400 mb-1">Steam ID: {currentUser.steamId}</p>
                <p className="text-sm text-zinc-400">{currentUser.steamName}</p>
              </div>

              <Button
                onClick={handleFinish}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-lg py-6"
              >
                <Gamepad2 className="w-6 h-6 mr-3" />
                ENTRAR NA ARENA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>Porquê?</strong> Usamos a tua Steam para verificar horas de jogo, VAC bans e calcular o Trust Score.
                </p>
              </div>

              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 inline mr-2" />
                <span className="text-sm text-yellow-200">
                  <strong>Importante:</strong> Só podes vincular uma conta Steam por conta.
                </span>
              </div>

              <Button
                onClick={() => window.location.href = "/api/auth/steam"}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-lg py-6"
              >
                <Gamepad2 className="w-6 h-6 mr-3" />
                VINCULAR CONTA STEAM
              </Button>

              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="w-full border-zinc-700"
              >
                Voltar
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
