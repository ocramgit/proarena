"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"
import { useState, useEffect } from "react"

export function MatchmakingBar() {
  const queueStatus = useQuery(api.queue.getQueueStatus)
  const leaveQueue = useMutation(api.queue.leaveQueue)
  const [waitTime, setWaitTime] = useState(0)

  useEffect(() => {
    if (queueStatus) {
      const interval = setInterval(() => {
        setWaitTime(Math.floor((Date.now() - Number(queueStatus.joinedAt)) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [queueStatus])

  const handleCancel = async () => {
    try {
      await leaveQueue()
    } catch (error) {
      console.error("Erro ao sair da fila:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!queueStatus) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t-2 border-orange-600 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            <div>
              <h3 className="text-lg font-black text-orange-500 uppercase">
                🔍 A procurar adversário
              </h3>
              <p className="text-sm text-zinc-400">
                Modo: <span className="font-bold text-zinc-100">{queueStatus.mode.toUpperCase()}</span> • 
                Tempo: <span className="font-bold text-orange-500">{formatTime(waitTime)}</span>
              </p>
            </div>
          </div>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-600/10"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
