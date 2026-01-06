"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Lock, Shield, Clock } from "lucide-react"

interface RestrictionModalProps {
  isOpen: boolean
  onClose: () => void
  type: "steam" | "hours" | "trust" | "banned" | "cooldown"
  details?: {
    currentHours?: number
    requiredHours?: number
    trustScore?: number
    cooldownSeconds?: number
    banReason?: string
  }
}

export function RestrictionModal({ isOpen, onClose, type, details }: RestrictionModalProps) {
  const getIcon = () => {
    switch (type) {
      case "steam":
        return <Lock className="w-16 h-16 text-orange-500" />
      case "hours":
        return <Clock className="w-16 h-16 text-yellow-500" />
      case "trust":
        return <Shield className="w-16 h-16 text-red-500" />
      case "banned":
        return <AlertTriangle className="w-16 h-16 text-red-600" />
      case "cooldown":
        return <Clock className="w-16 h-16 text-blue-500" />
      default:
        return <AlertTriangle className="w-16 h-16 text-zinc-500" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case "steam":
        return "Steam Não Vinculado"
      case "hours":
        return "Horas Insuficientes"
      case "trust":
        return "Trust Score Baixo"
      case "banned":
        return "Conta Banida"
      case "cooldown":
        return "Cooldown Ativo"
      default:
        return "Acesso Restrito"
    }
  }

  const getMessage = () => {
    switch (type) {
      case "steam":
        return "Precisas de vincular a tua conta Steam para jogar partidas competitivas."
      case "hours":
        return `Requisito de horas removido. Podes jogar livremente.`
      case "trust":
        return `O teu Trust Score (${details?.trustScore || 0}) está abaixo do mínimo necessário (800). Joga mais partidas para aumentar.`
      case "banned":
        return `A tua conta foi banida. Razão: ${details?.banReason || "Violação dos termos de serviço"}.`
      case "cooldown":
        const mins = Math.floor((details?.cooldownSeconds || 0) / 60)
        const secs = (details?.cooldownSeconds || 0) % 60
        return `Tens um cooldown ativo. Tempo restante: ${mins}m ${secs}s.`
      default:
        return "Não podes jogar neste momento."
    }
  }

  const getAction = () => {
    switch (type) {
      case "steam":
        return {
          label: "Vincular Steam",
          href: "/profile",
        }
      case "hours":
      case "trust":
        return {
          label: "Ver Perfil",
          href: "/profile",
        }
      case "banned":
      case "cooldown":
        return {
          label: "Entendido",
          href: null,
        }
      default:
        return {
          label: "Fechar",
          href: null,
        }
    }
  }

  const action = getAction()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <DialogTitle className="text-2xl font-black text-center">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center text-base pt-2">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-6">
          {action.href ? (
            <>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  window.location.href = action.href!
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
              >
                {action.label}
              </Button>
            </>
          ) : (
            <Button
              onClick={onClose}
              className="w-full bg-orange-600 hover:bg-orange-500"
            >
              {action.label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
