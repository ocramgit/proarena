"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface NicknameSetupModalProps {
  isOpen: boolean
  onComplete: () => void
  suggestedNickname?: string
}

export function NicknameSetupModal({ isOpen, onComplete, suggestedNickname }: NicknameSetupModalProps) {
  const [nickname, setNickname] = useState(suggestedNickname || "")
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const checkNickname = useQuery(
    api.users.checkNicknameAvailable,
    nickname.length >= 3 ? { nickname } : "skip"
  )

  const setUserNickname = useMutation(api.users.setNickname)

  // Update availability based on query result
  useEffect(() => {
    if (nickname.length < 3) {
      setIsAvailable(null)
      return
    }

    if (checkNickname !== undefined) {
      setIsAvailable(checkNickname)
    }
  }, [checkNickname, nickname])

  const handleNicknameChange = (value: string) => {
    // Only allow alphanumeric and underscore
    const sanitized = value.replace(/[^a-zA-Z0-9_]/g, "")
    setNickname(sanitized)
  }

  const handleSave = async () => {
    if (!nickname || nickname.length < 3) {
      toast.error("Nickname deve ter pelo menos 3 caracteres")
      return
    }

    if (!isAvailable) {
      toast.error("Este nickname já está em uso")
      return
    }

    setIsSaving(true)
    try {
      await setUserNickname({ nickname })
      toast.success("Nickname definido com sucesso!")
      onComplete()
    } catch (error: any) {
      toast.error(error.message || "Erro ao definir nickname")
    } finally {
      setIsSaving(false)
    }
  }

  const getValidationIcon = () => {
    if (nickname.length < 3) return null
    if (isChecking) return <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
    if (isAvailable === true) return <CheckCircle2 className="w-5 h-5 text-green-500" />
    if (isAvailable === false) return <XCircle className="w-5 h-5 text-red-500" />
    return null
  }

  const getValidationMessage = () => {
    if (nickname.length === 0) return null
    if (nickname.length < 3) return <p className="text-xs text-zinc-500 mt-1">Mínimo 3 caracteres</p>
    if (isChecking) return <p className="text-xs text-zinc-400 mt-1">A verificar...</p>
    if (isAvailable === true) return <p className="text-xs text-green-500 mt-1">✓ Disponível!</p>
    if (isAvailable === false) return <p className="text-xs text-red-500 mt-1">✗ Já está em uso</p>
    return null
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-md w-full p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white mb-2">Escolhe o teu Nickname</h2>
          <p className="text-zinc-400 text-sm">
            Este será o teu @username na ProArena. Escolhe com cuidado!
          </p>
        </div>

        <div className="space-y-4 py-4">
          {/* Info box */}
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <strong>Dica:</strong> Usa o teu nome Steam ou algo único e memorável
            </div>
          </div>

          {/* Input with validation */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-2 block">
              Nickname
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">
                @
              </div>
              <Input
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="nickname"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pl-8 pr-12"
                maxLength={20}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>
            {getValidationMessage()}
            <p className="text-xs text-zinc-500 mt-1">
              Apenas letras, números e _ (3-20 caracteres)
            </p>
          </div>

          {/* Preview */}
          {nickname && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
              <p className="text-xs text-zinc-500 mb-1">Preview:</p>
              <p className="text-lg font-bold text-white">@{nickname}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!isAvailable || isSaving || nickname.length < 3}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A guardar...
              </>
            ) : (
              "Confirmar Nickname"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
